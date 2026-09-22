import { MissingLockNodeError } from "@/error.ts";

/**
 * Serialize/deserialize helpers for `flake.lock` (and `nix flake metadata`)
 * data. The shapes mirror `src/flake.rs` in the Rust implementation.
 */

export interface Metadata {
  locks: Locks;
  [key: string]: unknown;
}

export interface Locks {
  root: string;
  nodes: Record<string, Node>;
  [key: string]: unknown;
}

export interface Node {
  inputs?: Record<string, Input>;
  [key: string]: unknown;
}

/**
 * A flake input is either a string referencing a lock node (`Introduce` in the
 * Rust code) or an array describing a `follows` path (`Follow`).
 */
export type Input = string | string[];

export function getNode(nodes: Record<string, Node>, key: string): Node {
  const node = nodes[key];
  if (node === undefined) {
    throw new MissingLockNodeError(key);
  }
  return node;
}
