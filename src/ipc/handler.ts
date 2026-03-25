import { ORPCError } from "@orpc/client";
import { RPCHandler } from "@orpc/server/message-port";
import { router } from "./router";

export const rpcHandler: RPCHandler<Record<never, never>> = new RPCHandler(
  router,
  {
    interceptors: [
      ({ next, ...rest }) => {
        return next(rest).catch((error: unknown) => {
          if (error instanceof ORPCError) throw error;
          const message =
            error instanceof Error ? error.message : "An unknown error occurred.";
          throw new ORPCError("INTERNAL_SERVER_ERROR", { message, cause: error });
        });
      },
    ],
  },
);
