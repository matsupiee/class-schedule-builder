import path from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Prisma's generated client for workerd uses `await import("./foo.wasm?module")`
// which only works inside workerd. For Node-based tests we rewrite the dynamic
// import to read the wasm file via fs and return a `WebAssembly.Module`.
function prismaWasmNodePatch(): Plugin {
  return {
    name: "prisma-wasm-node-patch",
    enforce: "pre",
    async transform(code, id) {
      if (!id.includes("generated/prisma/internal/class")) return null;
      if (!code.includes(".wasm?module")) return null;
      const wasmPath = path.resolve(
        path.dirname(id.split("?")[0]),
        "query_compiler_fast_bg.wasm",
      );
      const replaced = code.replace(
        /import\(["']\.\/query_compiler_fast_bg\.wasm\?module["']\)/,
        `(async () => {
          const { readFileSync } = await import("node:fs");
          return { default: new WebAssembly.Module(readFileSync(${JSON.stringify(wasmPath)})) };
        })()`,
      );
      return { code: replaced, map: null };
    },
  };
}

export default defineConfig({
  plugins: [tsconfigPaths(), prismaWasmNodePatch()],
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    server: {
      deps: {
        inline: ["@prisma/client", "@prisma/adapter-d1"],
      },
    },
  },
});
