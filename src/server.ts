import { createStartHandler } from "@tanstack/start-server-core";
import { defaultStreamHandler } from "@tanstack/react-start-server";
import { runWithCloudflareEnv } from "@/lib/server/cloudflare-context";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return runWithCloudflareEnv({ env, ctx }, () =>
      handler(request, {} as never),
    );
  },
};
