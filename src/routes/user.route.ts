import { Router } from "express";
import { getDashboardData } from "@/controllers/user.controller.js";
import { isAuthenticated } from "@/middlewares/auth.middleware.js";

const userRoutes = Router();

userRoutes.get("/dashboard", isAuthenticated, getDashboardData);

export { userRoutes };