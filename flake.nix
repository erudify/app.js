{
  description = "Next.js app with Cloudflare Workers";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            nodePackages.npm
          ];

          shellHook = ''
            echo "Next.js + Cloudflare Workers development environment"
            echo ""
            echo "Available commands:"
            echo "  npm run dev      - Start Next.js dev server"
            echo "  npm run preview  - Build and preview with wrangler"
            echo "  npm run deploy   - Deploy to Cloudflare Workers"
          '';
        };

        devShells.ci = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            nodePackages.npm
            # Playwright dependencies for headless Chromium
            playwright-driver.browsers
          ];

          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
          '';
        };
      }
    );
}
