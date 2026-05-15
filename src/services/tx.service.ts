import { prisma } from "@/utils/prisma";
import { blockchainQueue } from "@/utils/queue";
import { TransactionStatus, TransactionType } from "@prisma/client";

export async function initiateDeposit(
  userId: string,
  amount: number,
  ipfsCid: string | null,
  cooperativeId: string,
) {
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      amount,
      type: TransactionType.COTISATION,
      status: TransactionStatus.PENDING,
      ipfsCid,
      cooperativeId,
    },
  });

  // Ajouter à la file d'attente BullMQ pour traitement blockchain
  await blockchainQueue.add("process-deposit", { txId: transaction.id });

  return transaction;
}