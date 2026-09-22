{
  inputs = {
    flat-flake.url = "path:../..";
    flat-flake.inputs.nixpkgs.follows = "nixpkgs";
    flake-parts.url = "github:hercules-ci/flake-parts";
    flake-parts.inputs.nixpkgs-lib.follows = "nixpkgs";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
    nix-github-actions.url = "github:nix-community/nix-github-actions";
    nix-github-actions.inputs.nixpkgs.follows = "nixpkgs";
    crane.url = "github:ipetkov/crane";
    rust-overlay.url = "github:oxalica/rust-overlay";
    rust-overlay.inputs.nixpkgs.follows = "nixpkgs";
    flake-compat.url = "github:edolstra/flake-compat";
    flake-compat.flake = false;
  };

  outputs =
    inputs@{ self, flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      imports = [
        inputs.treefmt-nix.flakeModule
        inputs.flat-flake.flakeModules.flatFlake
      ];
      perSystem =
        {
          config,
          self',
          pkgs,
          ...
        }:
        let
          craneLib = inputs.crane.mkLib pkgs;
          src = craneLib.cleanCargoSource ../..;
          bareCommonArgs = { inherit src; };
          cargoArtifacts = craneLib.buildDepsOnly bareCommonArgs;
          commonArgs = bareCommonArgs // {
            inherit cargoArtifacts;
          };
        in
        {
          packages = {
            flat-flake = inputs.flat-flake.packages.${pkgs.system}.flat-flake;
            default = self'.packages.flat-flake;
          };
          checks = {
            package = self'.packages.flat-flake;
            fmt = craneLib.cargoFmt commonArgs;
            nextest = craneLib.cargoNextest (commonArgs // { cargoNextestExtraArgs = "--no-tests=warn"; });
            clippy = craneLib.cargoClippy (
              commonArgs // { cargoClippyExtraArgs = "--all-targets -- --deny warnings"; }
            );
          };
          devShells.default = pkgs.mkShell {
            inputsFrom = [ self'.packages.flat-flake ];
            packages = with pkgs; [
              rustup
              rust-analyzer
              config.treefmt.build.wrapper
            ];
          };
          treefmt = {
            projectRootFile = "flake.nix";
            programs = {
              nixfmt.enable = true;
              rustfmt.enable = true;
            };
          };
        };
      flake.githubActions = inputs.nix-github-actions.lib.mkGithubMatrix {
        checks = self.checks;
      };
    };
}
