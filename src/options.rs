use std::path::PathBuf;

use clap::{Parser, Subcommand};

#[derive(Clone, Debug, Parser)]
#[command(author, version, about, infer_subcommands = true)]
pub struct Options {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Clone, Debug, Subcommand)]
pub enum Commands {
    Check(CheckOptions),
    Completion(CompletionOptions),
}

#[derive(Clone, Debug, Parser)]
#[command(about = "Check flake")]
pub struct CheckOptions {
    #[arg(default_value = ".")]
    pub flake: String,
    #[arg(short, long)]
    pub lock_file: Option<PathBuf>,
    #[arg(short, long)]
    pub config_file: Option<PathBuf>,
}

#[derive(Clone, Debug, Parser)]
#[command(about = "Generate shell completions")]
pub struct CompletionOptions {
    pub shell: clap_complete::Shell,
}
