import { defineConfig } from "vitest/config";

/**
 * Vitest configuration.
 *
 * Tests never hit the network: every HTTP interaction is stubbed through
 * `basicConfig.fetch` (see `tests/helpers/mockFetch.ts`).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**"],
      reporter: ["text", "html"],
    },
  },
});
