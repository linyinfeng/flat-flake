/**
 * Hand-rolled argument parser. Replaces `clap` so the rewrite has no
 * dependencies. Behaviour follows the original CLI, including subcommand
 * prefix inference (`c` is ambiguous, `ch` and `co` work).
 */

export const VERSION = "0.1.0";
export const PROGRAM = "flat-flake";

export type Shell = "bash" | "elvish" | "fish" | "powershell" | "zsh";
export const SHELLS: readonly Shell[] = ["bash", "elvish", "fish", "powershell", "zsh"];

export interface CheckOptions {
  flake: string;
  lockFile?: string;
  configFile?: string;
}

export type Command =
  | { kind: "check"; options: CheckOptions }
  | { kind: "completion"; shell: Shell }
  | { kind: "help" }
  | { kind: "version" };

export interface Options {
  command: Command;
}

const SUBCOMMANDS = ["check", "completion"] as const;

export function parseOptions(argv: string[]): Options {
  const rest = [...argv];

  if (rest.includes("-h") || rest.includes("--help")) {
    return { command: { kind: "help" } };
  }
  if (rest.includes("-V") || rest.includes("--version")) {
    return { command: { kind: "version" } };
  }

  const subIndex = rest.findIndex((token) => !token.startsWith("-"));
  if (subIndex < 0) {
    console.error(`[ERROR] a subcommand is required`);
    console.log(usage())
    process.exit(2);
  }
  const unknown = rest.slice(0, subIndex);
  if (unknown.length > 0) {
    console.error(`[ERROR] unexpected argument '${unknown[0]}'`);
    console.log(usage())
    process.exit(2);
  }

  const { command, args } = resolveSubcommand(rest[subIndex]!, rest.slice(subIndex + 1));
  if (command === "check") {
    return { command: { kind: "check", options: parseCheck(args) } };
  }
  return { command: { kind: "completion", shell: parseCompletion(args) } };
}

function resolveSubcommand(name: string, args: string[]): { command: string; args: string[] } {
  const matches = SUBCOMMANDS.filter((candidate) => candidate.startsWith(name));
  if (matches.length === 0) {
    console.error(`[ERROR] unrecognized subcommand '${name}'`);
    console.log(usage());
    process.exit(2);
  }
  if (matches.length > 1) {
    console.error(
      `[ERROR] '${name}' is not a unique subcommand name, it could be ${matches
        .map((m) => `'${m}'`)
        .join(" or ")}`,
    );
    console.log(usage());
    process.exit(2);
  }
  return { command: matches[0]!, args };
}

function parseCheck(args: string[]): CheckOptions {
  const options: CheckOptions = { flake: "." };
  const positionals: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "-l" || arg === "--lock-file") {
      options.lockFile = requireValue(args, ++i, arg);
    } else if (arg.startsWith("--lock-file=")) {
      options.lockFile = arg.slice("--lock-file=".length);
    } else if (arg.startsWith("-l") && arg.length > 2) {
      options.lockFile = shortValue(arg, "-l");
    } else if (arg === "-c" || arg === "--config-file") {
      options.configFile = requireValue(args, ++i, arg);
    } else if (arg.startsWith("--config-file=")) {
      options.configFile = arg.slice("--config-file=".length);
    } else if (arg.startsWith("-c") && arg.length > 2) {
      options.configFile = shortValue(arg, "-c");
    } else if (arg.startsWith("-")) {
      console.error(`[ERROR] unexpected argument '${arg}' for 'check'`);
      console.log(usage());
      process.exit(2);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals.length > 1) {
    console.error(`[ERROR] unexpected argument '${positionals[1]}'`);
    console.log(usage());
    process.exit(2);
  }
  if (positionals.length === 1) {
    options.flake = positionals[0]!;
  }
  return options;
}

function parseCompletion(args: string[]): Shell {
  const positionals = args.filter((arg) => !arg.startsWith("-"));
  const unknown = args.filter((arg) => arg.startsWith("-"));
  if (unknown.length > 0) {
    console.error(`[ERROR] unexpected argument '${unknown[0]}' for 'completion'`);
    console.log(usage());
    process.exit(2);
  }
  if (positionals.length !== 1) {
    console.error("[ERROR] 'completion' requires a <SHELL> argument");
    console.log(usage());
    process.exit(2);
  }
  const shell = positionals[0] as Shell;
  if (!SHELLS.includes(shell)) {
    console.error(
      `[ERROR] invalid shell '${shell}', expected one of: ${SHELLS.join(", ")}`,
    );
    console.log(usage());
    process.exit(2);
  }
  return shell;
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (value === undefined) {
    console.error(`[ERROR] a value is required for '${flag}' but none was supplied`);
    console.log(usage());
    process.exit(2);
  }
  return value;
}

/** Extract the value from `-lVALUE` / `-l=VALUE` forms. */
function shortValue(arg: string, flag: string): string {
  const value = arg.slice(flag.length);
  return value.startsWith("=") ? value.slice(1) : value;
}

export function usage(): string {
  return [
    `Usage: ${PROGRAM} [OPTIONS] <COMMAND>`,
    "",
    "Commands:",
    "  check       Check flake",
    "  completion  Generate shell completions",
    "  help        Print this message",
    "",
    "Options:",
    "  -h, --help        Print this message",
    "  -V, --version     Print version",
  ].join("\n");
}

export function helpText(): string {
  return [
    `${PROGRAM} ${VERSION}`,
    "Enforce flat flake inputs. That is, all inputs are explicitly specified at the",
    "top-level or explicitly allowed.",
    "",
    usage(),
    "",
    "Check options:",
    "  -l, --lock-file <LOCK_FILE>",
    "          Read lock contents directly from a file instead of calling",
    "          `nix flake metadata --json`",
    "  -c, --config-file <CONFIG_FILE>",
    "          Read configuration directly from a file instead of calling",
    "          `nix eval flake#flatFlake --json`",
  ].join("\n");
}

export function versionText(): string {
  return `${PROGRAM} ${VERSION}`;
}
