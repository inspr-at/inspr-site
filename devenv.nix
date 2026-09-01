{ pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    lsp.enable = false;

    npm = {
      enable = true;
      install.enable = true;
    };

    directory = "./tools/higgsfield-cli";
  };
}
