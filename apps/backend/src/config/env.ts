import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory (../../ from src/config/)
dotenv.config({ path: path.resolve(__dirname, "../..", ".env") });

const envSchema = z.object({
  // Gemini API
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  // Server Config
  PORT: z.string().default("3100").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // PostgreSQL Database (Railway provides this automatically)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

// Parse and validate
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error("❌ Environment validation failed:");
  if (error instanceof z.ZodError) {
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
  }
  process.exit(1);
}

// Log database configuration status
console.log("🐘 PostgreSQL database configured");

export default env;
