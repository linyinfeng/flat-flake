# flat-flake

Enforce flat flake inputs. That is, all inputs are explicitly specified at the top-level or explicitly allowed.

## Usage

### CLI

Just run,

```nix
nix run github:linyinfeng/flat-flake -- check FLAKE
```

To explicitly allow non-top-level inputs, add these input paths to `outputs.flatFlake.allowed`, e.g. to add `flake-utils/system`:

```nix
{
  outputs = {...}: {
    flatFlake = {
      allowed = [
        ["flake-utils" "systems"]
      ];
    };
  };
}
```

Use `check --lock-file /path/to/flake.lock` to read lock contents directly from a file instead of calling `nix flake metadata --json`.

Use `check --config-file /path/to/flat-flake.json` to read configuration directly from a file instead of calling `nix eval flake#flatFlake --json`.

`flat-flake.json` example:

```json
{
  "allowed": [
    ["flake-utils", "systems"]
  ]
}
```

Use `--help` to get help information.

### flake-parts module

Just import `github:linyinfeng/flat-flake#flakeModules.flat-flake`. The module will create `checks.${system}.flat-flake` for you.

To set flat flake configuration, use the `flatFlake.config` option.
Set `flatFlake.check.enable = false` to disable check generation.
Set `flatFlake.output.enable = false` to disable configuration output.

Read <./flake-module.nix> for more information.
