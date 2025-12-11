import { initTRPC } from "@trpc/server";
import type { FastifyReply, FastifyRequest } from "fastify";

// Create context for each request
export interface Context {
  req: FastifyRequest;
  res: FastifyReply;
}

export const createContext = ({ req, res }: { req: FastifyRequest; res: FastifyReply }): Context => {
  return { req, res };
};

// Initialize tRPC with error formatting
const t = initTRPC.context<Context>().create({
  errorFormatter: ({ shape, error }) => {
    console.error(`[tRPC Error] ${shape.data.code}: ${shape.message}`, {
      path: shape.data.path,
    });

    return {
      ...shape,
      data: {
        ...shape.data,
        // Include Zod validation errors in development
        ...(process.env.NODE_ENV === "development" &&
          error.cause && {
            zodError: error.cause,
          }),
      },
    };
  },
});

// Export router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
