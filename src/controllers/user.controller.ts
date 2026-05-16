import type { Request, Response } from "express";
import { prisma } from "@/utils/prisma.js";
import { TransactionStatus, TransactionType } from "@prisma/client";

export const getDashboardData = async (req: Request, res: Response) => {
  const userId = req.session.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { where: { status: MembershipStatus.ACCEPTED }, include: { cooperative: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    const confirmedTransactions = await prisma.transaction.findMany({
      where: { userId, status: TransactionStatus.CONFIRMED },
    });
    const balance = confirmedTransactions.reduce((acc, tx) => {
      if (tx.type === TransactionType.COTISATION) return acc + tx.amount;
      if (tx.type === TransactionType.RETRAIT) return acc - tx.amount;
      return acc;
    }, 0);
    return res.status(200).json({ balance, currency: "FCFA", cooperatives: user.memberships.map(m => m.cooperative), transactions: user.transactions });
  } catch (error) {
    console.error("Erreur Dashboard:", error);
    return res.status(500).json({ message: "Erreur lors de la récupération des données du dashboard" });
  }
};