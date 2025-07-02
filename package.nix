{
  stdenv,
  lib,
  pnpm,
  bun,
  makeWrapper,
  fetchurl,
  ...
}: let
  packageJson = builtins.fromJSON (builtins.readFile ./package.json);
  crypto = fetchurl {
    url = "https://github.com/matrix-org/matrix-rust-sdk/releases/download/matrix-sdk-crypto-nodejs-v0.1.0-beta.6/matrix-sdk-crypto.linux-x64-gnu.node";
    sha256 = "sha256-+bjKA1CiCF0Yngaxn/raVonvhDo5RwXkc6EQaJPZ9IM=";
  };
in
  stdenv.mkDerivation (finalAttrs: {
    pname = packageJson.name;
    version = packageJson.version;

    src = ./.;

    buildPhase = ''
      runHook preBuild

      cp ${crypto} node_modules/.pnpm/node_modules/@matrix-org/matrix-sdk-crypto-nodejs/matrix-sdk-crypto.linux-x64-gnu.node

      runHook postBuild
    '';

    pnpmDeps = pnpm.fetchDeps {
      inherit (finalAttrs) pname version src;
      hash = "sha256-Bs6ikgvPbicnlY6oEsSb9nbpaTv1wk2kJoNKfd21I7M=";
    };

    nativeBuildInputs = [
      pnpm.configHook
      bun
      makeWrapper
    ];

    installPhase = let
      libPath = lib.makeLibraryPath [
        stdenv.cc.cc.lib
      ];

      binPath = lib.makeBinPath [
        bun
      ];
    in ''
      runHook preInstall

      mkdir -p $out/{${finalAttrs.pname},bin}
      cp -r * $out/${finalAttrs.pname}

      makeWrapper ${lib.getExe bun} $out/bin/${finalAttrs.pname} \
        --add-flags "--cwd=$out/${finalAttrs.pname} run $out/${finalAttrs.pname}/${packageJson.module}" \
        --set NODE_PATH $out/${finalAttrs.pname}/node_modules \
        --prefix PATH : ${binPath} \
        --prefix LD_LIBRARY_PATH : ${libPath}

      runHook postInstall
    '';

    meta = with lib; {
      description = packageJson.description;
      license = licenses.gpl3Only;
      maintainers = [
        {
          name = "CPlusPatch";
          email = "contact@cpluspatch.com";
          github = "CPlusPatch";
          githubId = 42910258;
          matrix = "@jesse:cpluspatch.dev";
        }
      ];
      platforms = ["x86_64-linux" "aarch64-linux"];
      mainProgram = finalAttrs.pname;
    };
  })
