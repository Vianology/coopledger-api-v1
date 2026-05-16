import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "@/config/env.js";

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const blockchainQueue = new Queue("blockchain-transactions", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});