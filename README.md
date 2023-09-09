# flat-flake

Flat nix flake checker. Ensure all flake inputs are top-level.

## Usage

Add settings in flake outputs:

```nix
{
  outputs = { ... }: {
    flatFlake = {
      enable = true;
    };
  };
}
```
