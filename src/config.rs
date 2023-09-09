use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub allowed: BTreeSet<Vec<String>>,
    #[serde(flatten)]
    pub other: BTreeMap<String, Value>,
}
