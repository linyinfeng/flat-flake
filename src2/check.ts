import { FlatFlakeError, ProcessFailedError, WrappedError } from "@/error.ts";
import { parseConfig, type Config } from "@/config.ts";
import { getNode, type Locks, type Node } from "@/flake.ts";

export interface CheckOptions {
  flake: string;
  lockFile?: string;
  configFile?: string;
}

const CONFIG_ATTRIBUTE_PATH = "flatFlake";

/** Outcome of a check: the two "expected" failures are plain return values. */
export interface CheckResult {
  ok: boolean;
  notAllowed: string[][];
  unused: string[][];
}

export async function check(options: CheckOptions): Promise<CheckResult> {
  const config = await getConfig(options);

  const locks = await getLocks(options);

  const { root, nodes } = locks;
  const rootNode = getNode(nodes, root);

  // Top-level inputs are implicitly allowed.
  const allowed: string[][] = [...config.allowed];
  for (const [name, input] of Object.entries(rootNode.inputs ?? {})) {
    if (typeof input === "string") allowed.push([name]);
  }

  const notAllowed: string[][] = [];
  checkNode(nodes, allowed, rootNode, [], notAllowed);

  return {
    ok: notAllowed.length === 0 && allowed.length === 0,
    notAllowed,
    unused: allowed,
  };
}

/** Recursively verify that every introduced input is explicitly allowed. */
export function checkNode(
  nodes: Record<string, Node>,
  allowed: string[][],
  current: Node,
  path: string[],
  notAllowed: string[][],
): void {
  for (const [name, input] of Object.entries(current.inputs ?? {})) {
    path.push(name);
    if (typeof input === "string") {
      const index = allowed.findIndex((entry) => samePath(entry, path));
      if (index < 0) {
        notAllowed.push([...path]);
      } else {
        allowed.splice(index, 1);
      }
      const next = getNode(nodes, input);
      checkNode(nodes, allowed, next, path, notAllowed);
    }
    // `follows` (array) inputs introduce nothing new and are skipped.
    path.pop();
  }
}

/** Input paths are visited exactly once, so reference-free equality suffices. */
function samePath(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((component, index) => component === b[index]);
}

async function getConfig(options: CheckOptions): Promise<Config> {
  if (options.configFile) {
    return readJsonFile(options.configFile).then(parseConfig);
  }

  const flake = options.flake;
  try {
    const raw = await callNix(["eval", `${flake}#${CONFIG_ATTRIBUTE_PATH}`]);
    return parseConfig(raw);
  } catch (error) {
    console.warn(`${Bun.color("yellow", "ansi")}[WARN] failed to eval '${flake}#${CONFIG_ATTRIBUTE_PATH}', use default configuration`);
    return { allowed: [] };
  }
}

async function getLocks(options: CheckOptions): Promise<Locks> {
  if (options.lockFile) {
    // A lock file contains the `locks` object at the top level.
    return parseLocks(await readJsonFile(options.lockFile));
  }

  const metadata = await callNix(["flake", "metadata", options.flake]);
  if (metadata === null || typeof metadata !== "object" || !("locks" in metadata)) {
    throw new FlatFlakeError("flake metadata did not contain a 'locks' field");
  }
  return parseLocks((metadata as Record<string, unknown>).locks);
}

/** Validate a `flake.lock` object (root + nodes) at runtime. */
function parseLocks(raw: unknown): Locks {
  if (raw === null || typeof raw !== "object") {
    throw new FlatFlakeError("invalid flake lock: expected a JSON object");
  }
  const { root, nodes } = raw as Record<string, unknown>;
  if (typeof root !== "string" || root.length === 0) {
    throw new FlatFlakeError("flake lock is missing a root node");
  }
  if (nodes === null || typeof nodes !== "object") {
    throw new FlatFlakeError("flake lock is missing its 'nodes' map");
  }
  return raw as Locks;
}

async function readJsonFile(path: string): Promise<unknown> {
  try {
    return await Bun.file(path).json();
  } catch (error) {
    throw new WrappedError(error, `failed to read ${path}`);
  }
}

/** Run `nix <args> --json --extra-experimental-features 'nix-command flakes'`. */
export async function callNix<T = unknown>(args: string[]): Promise<T> {
  const command = [
    "nix",
    ...args,
    "--json",
    "--extra-experimental-features",
    "nix-command flakes",
  ];

  const result = Bun.spawnSync({
    cmd: command,
    stdout: "pipe",
    stderr: "inherit",
  });
  const stdout = new TextDecoder().decode(result.stdout);

  if (!result.success) {
    throw new ProcessFailedError({
      command,
      status: result.exitCode,
      signal: result.signalCode ?? null,
      stdout,
    });
  }

  try {
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new WrappedError(error, "failed to parse nix output as JSON");
  }
}
