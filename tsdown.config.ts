import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/cli.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  deps: {
    neverBundle: [
      "commander",
      "execa",
      "fs-extra",
      /^node:/,
    ],
  },
  banner: "#!/usr/bin/env node",
  sourcemap: true,
});
