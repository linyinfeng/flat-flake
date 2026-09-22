export interface ProcessInfo {
  command: string[];
  status: number | null;
  signal: string | null;
  stdout: string;
}

/** Mirrors the `Error` enum of the Rust implementation. */
export class FlatFlakeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlatFlakeError";
  }
}

export class ProcessFailedError extends FlatFlakeError {
  constructor(public readonly info: ProcessInfo) {
    super(
      [
        `process failed: command: ${JSON.stringify(info.command)}`,
        `exit status: ${info.signal ?? info.status}`,
        `stdout:`,
        JSON.stringify(info.stdout),
      ].join("\n"),
    );
    this.name = "ProcessFailedError";
  }
}

export class MissingLockNodeError extends FlatFlakeError {
  constructor(key: string) {
    super(`missing flake lock node: ${key}`);
    this.name = "MissingLockNodeError";
  }
}

/** Handles JSON / filesystem failures uniformly. */
export class WrappedError extends FlatFlakeError {
  constructor(public readonly originalCause: unknown, label: string) {
    super(`${label}: ${String(originalCause)}`);
    this.name = "WrappedError";
  }
}

export function displayPaths(paths: string[][]): string {
  return "[" + [...paths]
    .map((path) => `[${path.map((component) => JSON.stringify(component)).join(", ")}]`)
    .join(",\n ") + "]";
}