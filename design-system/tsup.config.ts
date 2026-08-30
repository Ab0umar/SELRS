import { defineConfig } from "tsup";
import path from "node:path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  outDir: "dist",
  splitting: false,
  external: ["react", "react-dom"],
  esbuildOptions(options) {
    const syncStoreShim = path.resolve(
      __dirname,
      "shims/use-sync-external-store-shim.mjs",
    );
    const syncStoreWithSelectorShim = path.resolve(
      __dirname,
      "shims/use-sync-external-store-with-selector-shim.mjs",
    );
    options.alias = {
      ...options.alias,
      "use-sync-external-store/shim/with-selector": syncStoreWithSelectorShim,
      "use-sync-external-store/shim/with-selector.js": syncStoreWithSelectorShim,
      "use-sync-external-store/with-selector": syncStoreWithSelectorShim,
      "use-sync-external-store/with-selector.js": syncStoreWithSelectorShim,
      "use-sync-external-store/shim/index.js": syncStoreShim,
      "use-sync-external-store/shim": syncStoreShim,
      "use-sync-external-store": syncStoreShim,
    };
  },
});
