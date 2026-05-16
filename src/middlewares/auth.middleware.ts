import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "@/utils/auth.js";
import { prisma } from "@/utils/prisma.js";

declare global {
  namespace Express {
    interface Request {
      session: typeof auth.$Infer.Session;
    }
  }
}

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) return res.status(401).json({ message: "Unauthorized" });
  req.session = session;
  next();
}

export async function isPlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  const admin = await prisma.user.findUnique({ where: { id: user.id, role: "ADMIN" } });
  if (!admin) return res.status(403).json({ message: "Forbidden" });
  next();
}