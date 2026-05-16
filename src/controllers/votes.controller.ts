import {
  VoteStatus,
  MembershipGrade,
  MembershipStatus,
  type VoteType,
} from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "@/utils/prisma.js";

// Erreur interne utilisée pour annuler une $transaction sans déclencher le handler 500
class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export async function proposeVote(req: Request, res: Response) {
  const {
    subject,
    description,
    proposals,
    endDate,
    type,
    cooperativeId,
    amount,
    beneficiary,
    paymentDeadline,
  } = req.body;

  if (!subject || !proposals || !endDate || !type || !cooperativeId) {
    return res.status(400).json({ message: "Les champs obligatoires ne sont pas renseignés" });
  }

  try {
    const vote = await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({
        where: {
          userId_cooperativeId: { userId: req.session.user.id, cooperativeId },
        },
      });

      if (
        !membership ||
        (membership.grade !== MembershipGrade.ADMIN &&
          membership.grade !== MembershipGrade.TREASURER)
      ) {
        throw new HttpError(403, "Seul le bureau peut proposer un vote");
      }

      const voterCount = await tx.membership.count({
        where: { cooperativeId, status: MembershipStatus.ACCEPTED },
      });

      return tx.vote.create({
        data: {
          subject: subject as string,
          description: description as string,
          proposals: proposals as string[],
          endDate: new Date(endDate),
          type: type as VoteType,
          cooperativeId,
          amount: amount ? Number(amount) : null,
          beneficiary: beneficiary as string,
          paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : null,
          totalEligibleVoters: voterCount,
          creatorId: req.session.user.id,
        },
      });
    });

    return res.status(201).json(vote);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Une erreur s'est produite" });
  }
}

export async function castVote(req: Request, res: Response) {
  const { voteId, choiceIndex } = req.body;

  if (!voteId || choiceIndex === undefined) {
    return res.status(400).json({ message: "ID de vote ou choix manquant" });
  }

  try {
    const voteCast = await prisma.$transaction(async (tx) => {
      const vote = await tx.vote.findUnique({
        where: { id: voteId },
        include: { _count: { select: { voteCasts: true } } },
      });

      if (!vote || vote.status !== VoteStatus.OPEN) {
        throw new HttpError(404, "Le vote n'est pas ouvert");
      }

      const membership = await tx.membership.findUnique({
        where: {
          userId_cooperativeId: {
            userId: req.session.user.id,
            cooperativeId: vote.cooperativeId,
          },
        },
      });

      if (!membership || membership.status !== MembershipStatus.ACCEPTED) {
        throw new HttpError(403, "Vous n'êtes pas membre actif de cette coopérative");
      }

      const existingCast = await tx.voteCast.findUnique({
        where: { voteId_userId: { voteId, userId: req.session.user.id } },
      });

      if (existingCast) {
        throw new HttpError(409, "Vous avez déjà voté pour ce vote");
      }

      const created = await tx.voteCast.create({
        data: {
          voteId,
          userId: req.session.user.id,
          choiceIndex: Number(choiceIndex),
        },
      });

      // Mise à jour de la dernière activité du membre
      await tx.membership.update({
        where: {
          userId_cooperativeId: {
            userId: req.session.user.id,
            cooperativeId: vote.cooperativeId,
          },
        },
        data: { lastActiveAt: new Date() },
      });

      // Clôture automatique si tous les membres ont voté
      if (vote._count.voteCasts + 1 >= vote.totalEligibleVoters) {
        await tx.vote.update({
          where: { id: voteId },
          data: { status: VoteStatus.CLOSED },
        });
      }

      return created;
    });

    return res.status(201).json(voteCast);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Une erreur s'est produite" });
  }
}