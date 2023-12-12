use std::{
    collections::{BTreeMap, BTreeSet},
    fs::File,
    io::BufReader,
    process::{Command, Output, Stdio},
    vec,
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
    let config = get_config(&check_options)?;
    log::debug!("config: {:#?}", config);

    let locks = get_locks(&check_options)?;
    log::debug!("{:#?}", locks);

    let Locks { root, nodes, .. } = &locks;

    let root_node = &get_node(nodes, root)?;

    let mut allowed = config.allowed;
    allowed.extend(root_node.inputs.iter().filter_map(|(k, i)| match i {
        Input::Introduce(_) => Some(vec![k.to_owned()]),
        Input::Follow(_) => None,
    }));

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

pub fn get_config(options: &CheckOptions) -> Result<Config, Error> {
    if let Some(path) = &options.config_file {
        let file = BufReader::new(File::open(path)?);
        return Ok(serde_json::from_reader(file)?);
    }

    let flake = &options.flake;
    match call_nix(["eval", &format!("{flake}#{CONFIG_ATTRIBUTE_PATH}")]) {
        Ok(c) => Ok(c),
        Err(e) => {
            log::debug!("error: {}", e);
            log::info!(
                "failed to eval '{flake}#{CONFIG_ATTRIBUTE_PATH}', use default configuration"
            );
            Ok(Default::default())
        }
    }
}

pub fn get_locks(options: &CheckOptions) -> Result<Locks, Error> {
    if let Some(path) = &options.lock_file {
        let file = BufReader::new(File::open(path)?);
        return Ok(serde_json::from_reader(file)?);
    }

    let metadata: Metadata = call_nix(["flake", "metadata", &options.flake])?;
    Ok(metadata.locks)
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
    args_vec.extend(
        [
            "--json",
            "--extra-experimental-features",
            "nix-command flakes",
        ]
        .into_iter()
        .map(|s| s.to_owned()),
    );
    let command_vec = {
        let mut cmd = vec!["nix".to_owned()];
        cmd.extend(args_vec.iter().cloned());
        cmd
    };

    let mut command = Command::new("nix");
    command.args(args_vec);

    log::trace!("run command: {:?}", command_vec);

    let output = get_command_output(command)?;

    let process_info = ProcessInfo {
        command: command_vec,
        status: output.status,
        stdout: String::from_utf8(output.stdout)?,
        stderr: String::from_utf8(output.stderr)?,
    };
    log::trace!("command called:\n{}", process_info);
    if !output.status.success() {
        return Err(Error::ProcessFailed(process_info));
    }

    Ok(serde_json::from_str(&process_info.stdout)?)
}

pub fn get_command_output(mut command: Command) -> Result<Output, Error> {
    let handle = command
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()?;
    Ok(handle.wait_with_output()?)
}
