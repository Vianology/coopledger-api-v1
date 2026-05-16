import type { Request, Response } from "express";
import * as IdentityService from "@/services/identity.service.js";

export const finalizeOnboarding = async (req: Request, res: Response) => {
  const userId = req.session.user.id;
  try {
    const updatedUser = await IdentityService.onboardUserBlockchain(userId);
    return res.status(200).json({ message: "Identité blockchain générée", publicKey: updatedUser.publicKey });
  } catch (error) {
    console.error("Erreur finalizeOnboarding:", error);
    return res.status(500).json({ message: "Erreur lors de la génération de l'identité blockchain" });
  }
};