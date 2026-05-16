import { Router } from "express";
import { deposit } from "@/controllers/tx.controller.js";
import { isAuthenticated } from "@/middlewares/auth.middleware.js";

const txRoutes = Router();

txRoutes.post("/deposit", isAuthenticated, deposit);

export default txRoutes;