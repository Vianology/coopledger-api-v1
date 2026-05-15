import type { Request, Response } from "express";
import * as TxService from "@/services/tx.service";

export async function deposit(req: Request, res: Response) {
  try {
    const { amount, ipfsCid, cooperativeId } = req.body;
    if (!amount || !cooperativeId) {
      return res.status(400).json({
        message: "Champs manquants : amount et cooperativeId sont requis",
      });
    }

    const transaction = await TxService.initiateDeposit(
      req.session.user.id,
      amount,
      ipfsCid || null,
      cooperativeId,
    );

    return res.status(202).json({
      message: "Cotisation enregistrée, en attente de validation blockchain",
      transactionId: transaction.id,
    });
  } catch (error) {
    console.error("Erreur deposit:", error);
    return res.status(500).json({
      message: "Une erreur s'est produite lors du dépôt",
    });
  }
}