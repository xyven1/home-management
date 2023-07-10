{
  inputs.dream2nix.url = "github:nix-community/dream2nix";
  outputs = inp:
    inp.dream2nix.lib.makeFlakeOutputs {
      systems = ["x86_64-linux"];
      config.projectRoot = ./.;
      source = ./.;
      projects = {
        server = {
          name = "server";
          relPath = "server";
          subsystem = "nodejs";
          translator = "package-lock";
          subsystemInfo = {
            nodejs = 18;
          };
        };
        ui = {
          name = "ui";
          relPath = "ui";
          subsystem = "nodejs";
          translator = "package-lock";
          subsystemInfo = {
            nodejs = 18;
          };
        };
      };
    };
}