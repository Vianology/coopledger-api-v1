import { Router } from "express";
import {
  approveCooperativeJoin,
  createCooperative,
  getCooperatives,
  joinCooperative,
} from "@/controllers/cooperatives.controller.js";
import { isAuthenticated, isPlatformAdmin } from "@/middlewares/auth.middleware.js";
import { upload } from "@/utils/upload.js";

const cooperativesRoutes = Router();

cooperativesRoutes.post(
  "/create",
  upload.fields([
    { name: "status_document", maxCount: 1 },
    { name: "proof_document", maxCount: 1 },
    { name: "identity_document", maxCount: 1 },
    { name: "business_plan_document", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  isAuthenticated,
  createCooperative,
);

cooperativesRoutes.get("/", isAuthenticated, getCooperatives);
cooperativesRoutes.post("/join", isAuthenticated, joinCooperative);
cooperativesRoutes.post("/join/approve", isAuthenticated, isPlatformAdmin, approveCooperativeJoin);

export { cooperativesRoutes };