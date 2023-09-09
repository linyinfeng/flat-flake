{flat-flake}: {
  config,
  self,
  lib,
  ...
}: let
  inherit
    (lib)
    mkOption
    mkIf
    types
    ;
in {
  _file = ./flake-module.nix;
  options.flatFlake = {
    check = mkOption {
      description = ''
        Whether to add flat-flake check to checks.
      '';
      type = types.bool;
      default = true;
    };
    allowed = mkOption {
      description = ''
        Explicitly allowed inputs.
      '';
      type = with types; listOf (listOf str);
      default = [];
      example = [
        ["flake-utils" "systems"]
      ];
    };
  };
  config = {
    flake.flatFlake = {inherit (config.flatFlake) allowed;};
    perSystem = {
      pkgs,
      system,
      ...
    }: let
      json = pkgs.formats.json {};
      configFile = json.generate "flat-flake.json" self.flatFlake;
      check =
        pkgs.runCommand "flat-flake-check" {
          nativeBuildInputs = [pkgs.nix flat-flake.packages.${system}.flat-flake];
          env.RUST_LOG = "debug";
        } ''
          flat-flake check \
            --lock-file "${self}/flake.lock" \
            --config-file "${configFile}"
          touch "$out"
        '';
    in {
      checks.flat-flake = mkIf config.flatFlake.check check;
    };
  };
}
