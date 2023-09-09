use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    pub enable: bool,
    pub allowed: BTreeSet<Vec<String>>,
}
