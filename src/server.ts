import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { Server } from "socket.io";
import { FedaPay } from "fedapay";
import { env } from "@/config/env";
import { auth } from "@/utils/auth";
import { cooperativesRoutes } from "@/routes/cooperatives.route";
import { otpRoutes } from "@/routes/otp.route";
import { paymentsRoutes } from "@/routes/payments.route";
import { userRoutes } from "@/routes/user.route";
import { votesRoutes } from "@/routes/votes.route";
import txRoutes from "@/routes/tx.route";   // nouveau
import "@/workers/blockchain.worker";       // démarre le worker

FedaPay.setApiKey(env.FEDAPAY_SECRET_KEY);
FedaPay.setEnvironment(env.NODE_ENV === "production" ? "live" : "sandbox");

const app = express();
const server = createServer(app);
export const io = new Server(server, { cors: { origin: "*" } });

app.use(cors({ origin: "*", credentials: true }));
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.all("/api/auth/*", toNodeHandler(auth));
app.use("/api/auth/whatsapp", otpRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/cooperatives", cooperativesRoutes);
app.use("/api/user", userRoutes);
app.use("/api/votes", votesRoutes);
app.use("/api/transactions", txRoutes);     // ajout

server.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT}`);
});