import { Router } from "express";
import { initiatePayment, paymentCallback } from "@/controllers/payments.controller.js";
import { isAuthenticated } from "@/middlewares/auth.middleware.js";

const paymentsRoutes = Router();

paymentsRoutes.post("/initiate", isAuthenticated, initiatePayment);
paymentsRoutes.post("/callback", paymentCallback);

export { paymentsRoutes };