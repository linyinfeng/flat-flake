use std::{
    collections::{BTreeMap, BTreeSet},
    process::Command,
};

use crate::flake::{Input, Locks, Metadata, Node};
use serde::de::DeserializeOwned;

use crate::{
    config::Config,
    error::{Error, ProcessInfo},
    options::CheckOptions,
};

const CONFIG_ATTRIBUTE_PATH: &str = "flatFlake";

pub fn check(check_options: CheckOptions) -> Result<(), Error> {
    let flake = check_options.flake;
    let config: Config = call_nix(["eval", &format!("{flake}#{CONFIG_ATTRIBUTE_PATH}")])?;
    if !config.enable {
        log::info!("{flake}#{CONFIG_ATTRIBUTE_PATH}.enable = false, exit");
        return Ok(());
    }
    let metadata: Metadata = call_nix(["flake", "metadata", &flake])?;
    log::debug!("config: {:#?}", config);
    log::debug!("{:#?}", metadata);

    let Locks { root, nodes, .. } = &metadata.locks;

    let root_node = &get_node(nodes, root)?;

    let mut allowed = config.allowed;
    allowed.extend(root_node.inputs.keys().map(|k| vec![k.to_owned()]));

    let mut not_allowed = BTreeSet::new();

    let mut path: Vec<String> = vec![];
    check_node(nodes, &mut allowed, root_node, &mut path, &mut not_allowed)?;

    if !not_allowed.is_empty() {
        return Err(Error::NotFlat(not_allowed));
    }

    if !allowed.is_empty() {
        return Err(Error::UnusedAllowed(allowed));
    }

    Ok(())
}

pub fn check_node(
    nodes: &BTreeMap<String, Node>,
    allowed: &mut BTreeSet<Vec<String>>,
    current: &Node,
    path: &mut Vec<String>,
    not_allowed: &mut BTreeSet<Vec<String>>,
) -> Result<(), Error> {
    log::debug!("checking {path:?}");
    for (name, input) in &current.inputs {
        path.push(name.to_owned());
        if let Input::Introduce(key) = input {
            if !allowed.remove(&*path) {
                not_allowed.insert(path.clone());
            }
            let next = get_node(nodes, key)?;
            check_node(nodes, allowed, next, path, not_allowed)?;
        }
        path.pop();
    }
    Ok(())
}

pub fn get_node<'a>(nodes: &'a BTreeMap<String, Node>, key: &str) -> Result<&'a Node, Error> {
    nodes
        .get(key)
        .ok_or_else(|| Error::MissingLockNode(key.to_string()))
}

pub fn call_nix<I, S, T>(args: I) -> Result<T, Error>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
    T: DeserializeOwned,
{
    let mut args_vec: Vec<_> = args.into_iter().map(|s| s.as_ref().to_owned()).collect();
    args_vec.push("--json".to_owned());
    let command_vec = {
        let mut cmd = vec!["nix".to_owned()];
        cmd.extend(args_vec.iter().cloned());
        cmd
    };

    let mut command = Command::new("nix");
    command.args(args_vec);

    log::debug!("run command: {:?}", command_vec);

    let output = command.output()?;

    let process_info = ProcessInfo {
        command: command_vec,
        status: output.status,
        stdout: String::from_utf8(output.stdout)?,
        stderr: String::from_utf8(output.stderr)?,
    };
    log::debug!("command called:\n{}", process_info);
    if !output.status.success() {
        return Err(Error::ProcessFailed(process_info));
    }

    Ok(serde_json::from_str(&process_info.stdout)?)
}
