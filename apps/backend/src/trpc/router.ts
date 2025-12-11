import { algosheetRouter } from "./routers/algosheet.js";
import { router } from "./trpc.js";

// Main app router combining all routers
export const appRouter = router({
  algosheet: algosheetRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
