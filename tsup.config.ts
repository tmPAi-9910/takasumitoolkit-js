import { defineConfig } from "tsup";

/**
 * tsup build configuration.
 *
 * Emits ESM (`dist/index.js`), CommonJS (`dist/index.cjs`) and bundled type
 * declarations (`dist/index.d.ts`) from the single entry point `src/index.ts`.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "node20",
  platform: "neutral",
});
