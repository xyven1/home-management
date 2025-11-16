{
  description = "Home Management flake";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };
  outputs = {
    self,
    nixpkgs,
    ...
  }: let
    forAllSystems = f:
      nixpkgs.lib.genAttrs
      ["x86_64-linux"]
      (system: f nixpkgs.legacyPackages.${system});
    fs = nixpkgs.lib.fileset;
  in {
    packages = forAllSystems (pkgs: {
      default = pkgs.buildNpmPackage {
        name = "home-management-server";
        src = fs.toSource {
          root = ./.;
          fileset = fs.unions [
            ./package.json
            ./package-lock.json
            ./lib
            ./server
            ./ui
          ];
        };
        npmDepsHash = "sha256-tBUF6kOcY4IZ1x24YF9bcFD+N+TzBuuFLXekwNFS0yA=";
        makeCacheWritable = true;
        npmWorkspace = "server";
        buildPhase = ''
          runHook preBuild
          npm run build --workspace server
          npm run build --workspace lib
          npm run build --workspace ui
          runHook postBuild
        '';
        postInstall = ''
          LIB_DIR=$out/lib/node_modules/home-management/node_modules/@home-management
          rm -rf "$LIB_DIR" "$(dirname "$LIB_DIR")/.bin"
          mkdir -p "$LIB_DIR"
          cp -r lib "$LIB_DIR"/lib
          cp -r ui $"$LIB_DIR"/ui
        '';

        meta.mainProgram = "home-management-server";
      };
    });
    devShell = forAllSystems (pkgs:
      pkgs.mkShell {
        inputsFrom = [self.packages.${pkgs.stdenv.hostPlatform.system}.default];
        packages = with pkgs; [
          typescript
          nodemon
          typescript-language-server
          vue-language-server
          prettier-d-slim
          eslint_d
        ];
      });
  };
}
