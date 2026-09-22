{
  nixConfig = {
    extra-substituters = [ "https://linyinfeng.cachix.org" ];
    extra-trusted-public-keys = [
      "linyinfeng.cachix.org-1:sPYQXcNrnCf7Vr7T0YmjXz5dMZ7aOKG3EqLja0xr9MM="
    ];
  };

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          flat-flake = pkgs.callPackage ./package.nix { };
          default = self.packages.${system}.flat-flake;
        }
      );
      checks = self.packages;
      overlays.default = final: _prev: {
        flat-flake = final.callPackage ./package.nix { };
      };
      flakeModules.flatFlake = import ./flake-module.nix { flat-flake = self; };
    };
}
