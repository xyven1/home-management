{
  inputs.dream2nix.url = "github:nix-community/dream2nix";
  outputs = inp:
    inp.dream2nix.lib.makeFlakeOutputs {
      systems = ["x86_64-linux"];
      config.projectRoot = ./.;
      source = ./.;
      projects = {
        home-management = {
          name = "home-management";
          relPath = "";
          subsystem = "nodejs";
          translator = "package-lock";
          subsystemInfo = {
            nodejs = 18;
            workspaces = [ "server" "lib" "ui" ];
          };
        };
      };
    };
}