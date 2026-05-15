import { Router } from "express";
import { sendOTP, verifyOTP } from "@/controllers/otp.controller";

const otpRoutes = Router();

otpRoutes.post("/send-code", sendOTP);
otpRoutes.post("/verify", verifyOTP);

export { otpRoutes };