{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    flake-parts.inputs.nixpkgs-lib.follows = "nixpkgs";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
    crane.url = "github:ipetkov/crane";
    crane.inputs.nixpkgs.follows = "nixpkgs";
    rust-overlay.url = "github:oxalica/rust-overlay";
    rust-overlay.inputs.flake-utils.follows = "flake-utils";
    rust-overlay.inputs.nixpkgs.follows = "nixpkgs";
    systems.url = "github:nix-systems/default";
    flake-utils.url = "github:numtide/flake-utils";
    flake-utils.inputs.systems.follows = "systems";
    flake-compat.url = "github:edolstra/flake-compat";
    flake-compat.flake = false;
  };

  outputs =
    inputs@{ self, flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } (
      let
        flakeModule = import ./flake-module.nix { flat-flake = self; };
      in
      {
        systems = import inputs.systems;
        imports = [
          inputs.flake-parts.flakeModules.easyOverlay
          inputs.treefmt-nix.flakeModule
          flakeModule
        ];
        flake.flakeModules.flatFlake = flakeModule;
        perSystem =
          {
            self',
            config,
            pkgs,
            lib,
            system,
            ...
          }:
          let
            craneLib = inputs.crane.lib.${system};
            src = craneLib.cleanCargoSource ./.;
            bareCommonArgs = {
              inherit src;
              nativeBuildInputs = with pkgs; [ installShellFiles ];
            };
            cargoArtifacts = craneLib.buildDepsOnly bareCommonArgs;
            commonArgs = bareCommonArgs // {
              inherit cargoArtifacts;
            };
          in
          {
            packages = {
              flat-flake = craneLib.buildPackage (
                commonArgs
                // {
                  postInstall = ''
                    installShellCompletion --cmd flat-flake \
                      --bash <($out/bin/flat-flake completion bash) \
                      --fish <($out/bin/flat-flake completion fish) \
                      --zsh  <($out/bin/flat-flake completion zsh)
                  '';
                }
              );
              default = config.packages.flat-flake;
            };
            overlayAttrs.flat-flake = config.packages.flat-flake;
            checks = {
              package = self'.packages.flat-flake;
              doc = craneLib.cargoDoc commonArgs;
              fmt = craneLib.cargoFmt { inherit src; };
              nextest = craneLib.cargoNextest commonArgs;
              clippy = craneLib.cargoClippy (
                commonArgs // { cargoClippyExtraArgs = "--all-targets -- --deny warnings"; }
              );
            };
            devShells.default = pkgs.mkShell {
              inputsFrom = lib.attrValues self'.checks;
              packages = with pkgs; [
                rustup
                rust-analyzer
              ];
            };
            treefmt = {
              projectRootFile = "flake.nix";
              programs = {
                nixfmt-rfc-style.enable = true;
                rustfmt.enable = true;
              };
            };
          };
      }
    );
}
