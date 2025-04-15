{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    flake-utils = {
      url = "github:numtide/flake-utils";
    };
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
      };
      pnpm = pkgs.pnpm;

      crypto = pkgs.fetchurl {
        url = "https://github.com/matrix-org/matrix-rust-sdk/releases/download/matrix-sdk-crypto-nodejs-v0.1.0-beta.6/matrix-sdk-crypto.linux-x64-gnu.node";
        sha256 = "sha256-+bjKA1CiCF0Yngaxn/raVonvhDo5RwXkc6EQaJPZ9IM=";
      };
    in {
      packages = rec {
        bitchbot = pkgs.stdenv.mkDerivation (finalAttrs: {
          pname = "bitchbot";
          version = "0.0.1";

          src = ./.;

          buildPhase = ''
            runHook preBuild

            (
              cd node_modules/.pnpm/node_modules/@matrix-org/matrix-sdk-crypto-nodejs
              cp ${crypto} matrix-sdk-crypto.linux-x64-gnu.node
            )

            runHook postBuild
          '';

          pnpmDeps = pnpm.fetchDeps {
            inherit (finalAttrs) pname version src;
            hash = "sha256-L9xM0W8h/2dSeUbPHR8Su/ra7CUCmLRU3+7VxlW/dkI=";
          };

          nativeBuildInputs = [
            pnpm.configHook
            pkgs.bun
            pkgs.makeWrapper
            pkgs.nodejs
          ];

          installPhase = ''
            runHook preInstall

            mkdir -p $out/bin
            mkdir -p $out/bitchbot
            cp -r * $out/bitchbot

            makeWrapper ${pkgs.lib.getExe pkgs.bun} $out/bin/bitchbot \
              --add-flags "run $out/bitchbot/index.ts"

            runHook postInstall
          '';
        });
        default = bitchbot;
      };

      apps = rec {
        bitchbot = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/bitchbot";
          meta = self.packages.${system}.default.meta;
        };
        default = bitchbot;
      };

      nixosModules = {
        bitchbot = {
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
                ExecStart = "${self.packages.${system}.default}/bin/bitchbot";
                Type = "simple";
                Restart = "always";
                RestartSec = "5s";

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
              home = cfg.dataDir;
              isSystemUser = true;
              packages = [
                self.packages.${system}.default
              ];
            };

            users.groups.bitchbot = {};
          };
        };
      };
    });
}
