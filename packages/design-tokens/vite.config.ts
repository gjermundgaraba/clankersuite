import { foldkitViewIdentity } from "@foldkit/vite-plugin";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [foldkitViewIdentity()],
  test: {
    include: ["docs/**/*.test.ts"],
    environment: "happy-dom",
    setupFiles: ["test-setup.ts"],
    server: { deps: { inline: ["foldkit", "@foldkit/ui"] } },
  },
});
