interface Env {
  DB: D1Database;
}

declare module "@tanstack/react-start/server" {
  interface RequestEventContext {
    cloudflare?: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}
