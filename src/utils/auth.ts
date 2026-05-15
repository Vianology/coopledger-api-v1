import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { expo } from "@better-auth/expo";
import { dash } from "@better-auth/infra";
import { env } from "@/config/env";
import { prisma } from "./prisma";

export const auth = betterAuth({
  appName: "CoopLedger",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: true,
  }),
  plugins: [expo(), dash()],
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    additionalFields: {
      phoneNumber: { type: "string", required: true, input: true },
      role: { type: "string", required: true, input: true },
    },
  },
  trustedOrigins: ["coopledger://"],
});