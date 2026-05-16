import { Router } from "express";
import { castVote, proposeVote } from "@/controllers/votes.controller.js";
import { isAuthenticated } from "@/middlewares/auth.middleware.js";

const votesRoutes = Router();

votesRoutes.post("/propose", isAuthenticated, proposeVote);
votesRoutes.post("/cast", isAuthenticated, castVote);

export { votesRoutes };