use std::{
    collections::BTreeSet,
    fmt::{Display, Formatter},
    process::ExitStatus,
};

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("io error: {0:?}")]
    Io(#[from] std::io::Error),
    #[error("utf8 error: {0:?}")]
    Utf8(#[from] std::string::FromUtf8Error),
    #[error("process failed: {0} ")]
    ProcessFailed(ProcessInfo),
    #[error("json error: {0:?}")]
    Serde(#[from] serde_json::Error),
    #[error("missing flake lock node: {0}")]
    MissingLockNode(String),
    #[error("not flat:\n{}", display_path(.0))]
    NotFlat(BTreeSet<Vec<String>>),
    #[error("unused allowed entry:\n{}", display_path(.0))]
    UnusedAllowed(BTreeSet<Vec<String>>),
}

#[derive(Debug)]
pub struct ProcessInfo {
    pub command: Vec<String>,
    pub status: ExitStatus,
    pub stdout: String,
    pub stderr: String,
}

impl Display for ProcessInfo {
    fn fmt(&self, f: &mut Formatter) -> std::fmt::Result {
        writeln!(f, "command: {:?}", self.command)?;
        writeln!(f, "exit status: {:?}", self.status)?;
        writeln!(f, "stdout:\n{:?}", self.stdout)?;
        writeln!(f, "stderr:\n{:?}", self.stderr)?;
        Ok(())
    }
}

pub fn display_path(paths: &BTreeSet<Vec<String>>) -> String {
    let mut result = String::new();
    for path in paths {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str("[ ");
        for component in path {
            result.push_str(&format!("{component:?} "));
        }
        result.push(']');
    }
    result
}
