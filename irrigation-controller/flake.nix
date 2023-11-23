{ 
    description = "PlatfomIO Develop Environment";

    inputs = {
        nixpkgs.url = "github:NixOS/nixpkgs";
        flake-utils.url = "github:numtide/flake-utils";
    };

    outputs = { self, nixpkgs, flake-utils }:
        flake-utils.lib.eachDefaultSystem
            (system:
                let 
                    pkgs = nixpkgs.legacyPackages.${system};

                    my-python = pkgs.python3;  
                    python-with-my-packages = my-python.withPackages (p: with p;
                    [
                        pip
                    ]);
                in
                {
                    devShells.default = pkgs.mkShell {
                        buildInputs = [
                            python-with-my-packages
                        ] ++ (with pkgs; [
                            platformio
                            esptool
                        ]);

                        shellHook = ''
                            PYTHONPATH=${python-with-my-packages}/${python-with-my-packages.sitePackages}  
                        '';
                    };
                }
            );
}