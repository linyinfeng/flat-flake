import { FlatFlakeError } from "@/error.ts";

/** Mirrors the serialized `flatFlake` configuration (`src/config.rs`). */
export interface Config {
  allowed: string[][];
  [key: string]: unknown;
}

export const defaultConfig = (): Config => ({ allowed: [] });

/**
 * Normalize an untrusted JSON value into a `Config`. Any malformed `allowed`
 * entries are rejected, while additional keys are preserved untouched.
 */
export function parseConfig(value: unknown): Config {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new FlatFlakeError(`invalid flatFlake configuration: ${JSON.stringify(value)}`);
  }
  const record = value as Record<string, unknown>;
  const allowed = record.allowed ?? [];
  if (!Array.isArray(allowed)) {
    throw new FlatFlakeError(`"allowed" must be a list of input paths`);
  }
  const paths = allowed.map((path, index) => {
    if (!Array.isArray(path) || path.some((component) => typeof component !== "string")) {
      throw new FlatFlakeError(`invalid allowed entry at index ${index}: ${JSON.stringify(path)}`);
    }
    return path as string[];
  });
  return { ...record, allowed: paths };
}
