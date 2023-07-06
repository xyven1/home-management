{
  description = "Home management";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    gitignore = {
      url = "github:hercules-ci/gitignore.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    dream2nix.url = "github:xyven1/dream2nix/patch-1";
  };
  outputs = { self, nixpkgs, flake-utils, gitignore, dream2nix, ... }:
    # Note: no need for flake-utils.lib.eachDefaultSystem, dream2nix does it for us
    dream2nix.lib.makeFlakeOutputs {
      systems = [ "x86_64-linux" ];
      config.projectRoot = ./.;
      source = gitignore.lib.gitignoreSource ./.;
      projects = ./projects.toml;
    };
}
