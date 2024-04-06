{ flat-flake }:
{
  config,
  self,
  lib,
  flake-parts-lib,
  ...
}:
let
  inherit (flake-parts-lib) mkPerSystemOption;
  flakeCfg = config.flatFlake;
  inherit (lib)
    mkOption
    mkIf
    types
    mkRenamedOptionModule
    ;
in
{
  _file = ./flake-module.nix;
  imports = [
    (mkRenamedOptionModule
      [
        "flatFlake"
        "check"
      ]
      [
        "perSystem"
        "flatFlake"
        "check"
      ]
    )
  ];
  options = {
    flatFlake = {
      output.enable = mkOption {
        description = ''
          Whether to output `config.flatFlake.config` as `outputs.flatFlake`.
        '';
        type = types.bool;
        default = true;
      };
      config = {
        allowed = mkOption {
          description = ''
            Explicitly allowed input paths.
          '';
          type = with types; listOf (listOf str);
          default = [ ];
          example = [
            [
              "flake-utils"
              "systems"
            ]
          ];
        };
      };
    };
    perSystem = mkPerSystemOption (
      { ... }:
      {
        options.flatFlake = {
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
        };
      }
    );
  };
  config = {
    flake = mkIf flakeCfg.output.enable { flatFlake = flakeCfg.config; };
    perSystem =
      {
        config,
        pkgs,
        system,
        ...
      }:
      let
        cfg = config.flatFlake;
        json = pkgs.formats.json { };
        configFile = json.generate "flat-flake.json" self.flatFlake;
        check =
          pkgs.runCommand "flat-flake-check"
            {
              nativeBuildInputs = [
                pkgs.nix
                flat-flake.packages.${system}.flat-flake
              ];
            }
            ''
              flat-flake check \
                --lock-file "${self}/flake.lock" \
                --config-file "${configFile}"
              touch "$out"
            '';
      in
      mkIf cfg.check.enable { checks.${cfg.check.name} = check; };
  };
}
