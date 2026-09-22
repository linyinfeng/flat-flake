# flat-flake (TypeScript rewrite)

A TypeScript rewrite of the Rust `flat-flake` checker, running on
[Bun](https://bun.sh). It enforces flat flake inputs: every input must be
declared at the top level or explicitly allowed.

## Design goals

- **Zero runtime dependencies** — only Bun/Node built-ins (`Bun.file`,
  `Bun.spawnSync`, `JSON.parse`). No `clap`, no `serde`, no runtime npm packages.
- **Dev dependencies are fine** — `typescript` and `@types/bun` are declared as
  `devDependencies` for type checking.
- **Same behaviour** — CLI surface, defaults, and error messages mirror the
  Rust implementation in `../src`.

## Layout

```
.
├── main.ts          # entry point (top level)
├── package.json     # top level, no "dependencies"
├── tsconfig.json    # top level, defines the "@/*" path alias -> "./src2/*"
└── src2/            # implementation
    ├── check.ts
    ├── completion.ts
    ├── config.ts
    ├── error.ts
    ├── flake.ts
    └── options.ts
```

Imports inside `src2/` use the `@/` alias (resolved to `src2/` by both `tsc`
and the Bun runtime):

```ts
import { check } from "@/check.ts";
```

## Usage

```fish
bun run main.ts check FLAKE
bun run main.ts check --lock-file /path/to/flake.lock
bun run main.ts check --config-file /path/to/flat-flake.json
bun run main.ts completion fish
```

### `flat-flake.json`

```json
{ "allowed": [["flake-utils", "systems"]] }
```

## Development

```fish
bun install          # install devDependencies
bun run typecheck    # tsc --noEmit
```

## Module map (Rust → TypeScript)

| Rust (`src/`) | TypeScript (`src2/`) | Responsibility |
| ------------- | -------------------- | -------------- |
| `main.rs`     | `../main.ts`         | Entry point, dispatch, exit codes |
| `options.rs`  | `options.ts`         | Hand-rolled CLI parser |
| `check.rs`    | `check.ts`           | Core traversal, `nix` invocation |
| `flake.rs`    | `flake.ts`           | `flake.lock` shapes |
| `config.rs`   | `config.ts`          | `flatFlake` config parsing |
| `error.rs`    | `error.ts`           | Error types and rendering |
| —             | `completion.ts`      | Shell completion generation |

## Not yet done

- Packaging as a `bun build --compile` binary or a Nix derivation.
- Wiring the `flake-parts` module to the TypeScript implementation.
