{flat-flake}: {
  config,
  self,
  lib,
  ...
}: let
  cfg = config.flatFlake;
  inherit
    (lib)
    mkOption
    mkIf
    types
    ;
in {
  _file = ./flake-module.nix;
  options.flatFlake = {
    output.enable = mkOption {
      description = ''
        Whether to output `config.flatFlake.config` as `outputs.flatFlake`.
      '';
      type = types.bool;
      default = true;
    };
    check = {
      enable = mkOption {
        description = ''
          Whether to add flat-flake check to `outputs.checks.''${config.flatFlake.check.name}`.
        '';
        type = types.bool;
        default = true;
      };
      name = mkOption {
        description = ''
          Name of the check.
        '';
        type = types.str;
        default = "flat-flake";
      };
    };
    config = {
      allowed = mkOption {
        description = ''
          Explicitly allowed input paths.
        '';
        type = with types; listOf (listOf str);
        default = [];
        example = [
          ["flake-utils" "systems"]
        ];
      };
    };
  };
  config = {
    flake = mkIf cfg.output.enable {
      flatFlake = cfg.config;
    };
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
        } ''
          flat-flake check \
            --lock-file "${self}/flake.lock" \
            --config-file "${configFile}"
          touch "$out"
        '';
    in {
      checks.${cfg.check.name} = mkIf cfg.check.enable check;
    };
  };
}
