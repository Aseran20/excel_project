import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastify from "fastify";
import env from "./config/env.js";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/trpc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("✅ Environment loaded and validated");
console.log("GEMINI_API_KEY:", env.GEMINI_API_KEY ? `Set (${env.GEMINI_API_KEY.length} chars)` : "NOT SET");

// Load HTTPS certificates for development
const certPath = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".office-addin-dev-certs",
  "localhost.crt"
);
const keyPath = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".office-addin-dev-certs",
  "localhost.key"
);

let httpsOptions: any = undefined;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  console.log("HTTPS certificates loaded");
} else {
  console.warn("HTTPS certificates not found, falling back to HTTP");
}

const server = fastify({
  logger: true,
  https: httpsOptions,
});

// CORS configuration for production and development
const allowedOrigins = [
  "http://localhost:3000",                      // Dev: webpack-dev-server
  "https://localhost:3000",                     // Dev: webpack-dev-server HTTPS
  "https://localhost:3100",                     // Dev: backend self-reference
  "https://excel.bulk.arclen.app",             // Production (unified domain)
];

server.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      cb(new Error("Not allowed by CORS"), false);
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
});

// Health check endpoint (for Docker healthcheck)
server.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Register tRPC at /api/trpc
await server.register(fastifyTRPCPlugin, {
  prefix: "/api/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
  },
});

// Serve static frontend files (production only)
const publicPath = path.join(__dirname, "../public");
if (fs.existsSync(publicPath)) {
  await server.register(fastifyStatic, {
    root: publicPath,
    prefix: "/",
    wildcard: false, // Don't serve index.html for all routes
  });

  // Fallback for SPA routing - serve index.html for non-API routes
  server.setNotFoundHandler(async (request, reply) => {
    // If it's an API route, return 404
    if (request.url.startsWith("/api/")) {
      return reply.status(404).send({ error: "Not found" });
    }
    // Otherwise serve index.html for SPA
    return reply.sendFile("index.html");
  });

  console.log("✅ Static files served from /public");
} else {
  console.log("ℹ️  No public folder found - API only mode");
}

console.log("✅ tRPC registered at /api/trpc");
console.log("✅ Health check endpoint at /health");

const start = async () => {
  try {
    await server.listen({ port: env.PORT, host: "0.0.0.0" });
    const protocol = httpsOptions ? "https" : "http";
    console.log(`Server listening on ${protocol}://localhost:${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
