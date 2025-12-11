import { parseOptions } from "@algosheet/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { callGemini } from "../../services/gemini.js";
import { publicProcedure, router } from "../trpc.js";

// Input validation schema
const algosheetInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  responseMode: z.enum(["free", "structured"]).nullable().optional(),
  schema: z.string().nullable().optional(),
  options: z.string().nullable().optional(),
});

export const algosheetRouter = router({
  // Main algosheet procedure
  query: publicProcedure.input(algosheetInputSchema).mutation(async ({ input, ctx }) => {
    const { prompt, responseMode, schema, options: optionsStr } = input;

    try {
      // Parse options using shared utility
      const options = parseOptions(optionsStr);

      // Call Gemini service
      const result = await callGemini(prompt, responseMode, schema, options);

      return result;
    } catch (error: any) {
      // Log error with context
      console.error("[Algosheet Procedure] Error:", error.message);

      // Throw tRPC error with appropriate code
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate content from Gemini",
        cause: error,
      });
    }
  }),

  // Health check procedure
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
});
