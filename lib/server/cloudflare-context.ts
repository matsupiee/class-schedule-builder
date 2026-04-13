import { AsyncLocalStorage } from "node:async_hooks";

interface CloudflareCtx {
  env: Env;
  ctx: ExecutionContext;
}

const storage = new AsyncLocalStorage<CloudflareCtx>();

export function runWithCloudflareEnv<T>(
  value: CloudflareCtx,
  fn: () => T,
): T {
  return storage.run(value, fn);
}

export function getCloudflareEnv(): Env {
  const store = storage.getStore();
  if (!store) {
    throw new Error(
      "Cloudflare env is not available. Server functions must be invoked through the Worker fetch handler.",
    );
  }
  return store.env;
}
