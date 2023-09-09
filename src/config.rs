use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub allowed: BTreeSet<Vec<String>>,
}
