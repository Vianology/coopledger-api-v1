import Redis from "ioredis";
import { env } from "@/config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export async function setOTP(phone: string, code: string): Promise<void> {
  await redis.set(`otp:${phone}`, code, "EX", 300);
}

export async function getOTP(phone: string): Promise<string | null> {
  return await redis.get(`otp:${phone}`);
}

export async function deleteOTP(phone: string): Promise<void> {
  await redis.del(`otp:${phone}`);
}