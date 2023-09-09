# flat-flake

Enforce flat flake inputs. That is, all inputs are explicitly specified in the top-level.

## Usage

### CLI

Just run,

```nix
nix run github:linyinfeng/flat-flake -- check FLAKE
```

To explicitly allow non-top-level inputs, add input paths to `flatFlake.allowed`, e.g. `flake-utils/system`:

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

Use `check --lock-file` to read lock contents directly from a file instead of calling `nix flake metadata --json`.

Use `check --config-file` to read configuration directly from a file instead of calling `nix eval flake#flatFlake --json`.

Use `--help` to get help information.

### flake-parts module

Just import `github:linyinfeng/flat-flake#flakeModules.flat-flake`. The module will create `checks.${system}.flat-flake` for you.
