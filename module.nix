{
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.services.bitchbot;
  configFile = configFormat.generate "config.toml" cfg.config;
  configFormat = pkgs.formats.toml {};

  inherit (lib.options) mkOption;
  inherit (lib.modules) mkIf;
in {
  options.services.bitchbot = {
    enable = mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether to enable the bitchbot service";
    };

    dataDir = mkOption {
      type = lib.types.str;
      default = "/var/lib/bitchbot";
      description = "Path to the data directory for the bot";
    };

    config = mkOption {
      type = with lib.types;
        submodule {
          freeformType = configFormat.type;
          options = {};
        };
      description = "Contents of the config file for the bitchbot service";
      default = {};
    };
  };

  config = mkIf cfg.enable {
    systemd.services.bitchbot = {
      after = ["network-online.target"];
      wantedBy = ["multi-user.target"];
      requires = ["network-online.target"];

      description = "Bitchbot service";

      serviceConfig = {
        ExecStart = lib.getExe pkgs.bitchbot;
        Type = "simple";
        Restart = "always";
        RestartSec = "60s";

        User = "bitchbot";
        Group = "bitchbot";

        StateDirectory = "bitchbot";
        StateDirectoryMode = "0700";
        RuntimeDirectory = "bitchbot";
        RuntimeDirectoryMode = "0700";

        # Set the working directory to the data directory
        WorkingDirectory = cfg.dataDir;

        StandardOutput = "journal";
        StandardError = "journal";
        SyslogIdentifier = "bitchbot";

        Environment = "CONFIG_FILE=${configFile}";
      };
    };

    users.users.bitchbot = {
      name = "bitchbot";
      group = "bitchbot";
      isSystemUser = true;
      packages = [
        pkgs.bitchbot
      ];
    };

    users.groups.bitchbot = {};
  };
}
