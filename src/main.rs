mod check;
mod config;
mod error;
mod flake;
mod options;

use clap::{CommandFactory, Parser};
use error::Error;
use options::{Commands, Options};

fn main() {
    let options = options::Options::parse();
    init_logger(&options);
    log::debug!("options = {options:#?}");
    if let Err(e) = main_result(options) {
        log::error!("{e}");
        std::process::exit(1);
    }
}

fn main_result(options: Options) -> Result<(), Error> {
    match options.command {
        Commands::Check(check_options) => check::check(check_options)?,
        Commands::Completion(completion_options) => generate_shell_completions(completion_options),
    }
    Ok(())
}

fn init_logger(options: &Options) {
    let mut builder = pretty_env_logger::formatted_builder();
    let default_level = match options.verbose {
        0 => "info",
        1 => "debug",
        _ => "trace",
    };
    let filters = match std::env::var("RUST_LOG") {
        Ok(f) => f,
        Err(_) => format!("flat_flake={default_level}"),
    };
    builder.parse_filters(&filters);
    builder.init()
}

fn generate_shell_completions(gen_options: options::CompletionOptions) {
    let mut cli = options::Options::command();
    let mut stdout = std::io::stdout();
    clap_complete::generate(gen_options.shell, &mut cli, "flat-flake", &mut stdout);
}
