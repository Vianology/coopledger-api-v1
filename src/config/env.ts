import { config } from "dotenv";
import { z } from "zod";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
config({ path: envFile });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string(),
  BETTER_AUTH_URL: z.string(),
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  ENCRYPTION_KEY: z.string().min(32),
  ALGORITHM: z.string().default("aes-256-gcm"),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  PINATA_JWT: z.string(),
  FEDAPAY_PUBLIC_KEY: z.string(),
  FEDAPAY_SECRET_KEY: z.string(),
  POLYGON_RPC_URL: z.string(),
  SYSTEM_PRIVATE_KEY: z.string(),
  CONTRACT_ADDRESS: z.string(),
  GOWA_API_URL: z.string(),
  GOWA_API_BASIC_AUTH: z.string(),
  GOWA_API_DEVICE_ID: z.string(),
});

const _env = envSchema.safeParse(process.env);
if (!_env.success) {
  console.error("❌ Invalid environment variables");
  for (const issue of _env.error.issues) {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = _env.data;