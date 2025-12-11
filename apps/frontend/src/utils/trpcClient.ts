import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/trpc/router";

// Get backend URL from environment or default to localhost
const BACKEND_URL = process.env.BACKEND_URL || "https://localhost:3100";

// Create tRPC client for vanilla JavaScript (no React hooks)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/api/trpc`,

      // Custom headers (if needed for auth or tracking)
      headers: () => {
        return {
          "Content-Type": "application/json",
        };
      },

      // Custom fetch for error handling
      fetch: async (url, options) => {
        try {
          const response = await fetch(url, {
            ...options,
            // Include credentials for cross-origin requests
            credentials: "include",
          });

          if (!response.ok) {
            console.error(`[tRPC] HTTP ${response.status}: ${response.statusText}`);
          }

          return response;
        } catch (error) {
          console.error("[tRPC] Network error:", error);
          throw error;
        }
      },
    }),
  ],
});

console.log("[tRPC Client] Initialized with backend URL:", BACKEND_URL);
