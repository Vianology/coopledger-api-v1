import { Router } from "express";
import { deposit } from "@/controllers/tx.controller";
import { isAuthenticated } from "@/middlewares/auth.middleware";

const router = Router();
router.post("/deposit", isAuthenticated, deposit);

export default router;