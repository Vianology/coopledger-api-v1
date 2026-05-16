import { env } from "@/config/env.js";
import { TransactionStatus, TransactionType } from "@prisma/client";
import type { Request, Response } from "express";
import { Transaction } from "fedapay";
import { prisma } from "@/utils/prisma.js";

export async function initiatePayment(req: Request, res: Response) {
  const { amount, type, cooperativeId, voteId, description } = req.body;
  if (!amount || !type || !cooperativeId) {
    return res.status(400).json({ message: "Missing amount, type or cooperativeId" });
  }

  try {
    const coop = await prisma.cooperative.findUnique({ where: { id: cooperativeId } });
    if (!coop || !coop.fedapayApiKeySecret) {
      return res.status(404).json({ message: "Cooperative or FedaPay config missing" });
    }

    Transaction.setApiKey(coop.fedapayApiKeySecret);
    const fedapayTx = await Transaction.create({
      description: description || `CoopLedger payment - ${type}`,
      amount: Number(amount),
      currency: { iso: "XOF" },
      callbackUrl: `https://${env.API_BASE_URL}/api/payments/callback`,
      customer: {
        email: req.session.user.email,
        firstname: req.session.user.name,
      },
    });

    const token = await fedapayTx.generateToken();

    await prisma.transaction.create({
      data: {
        amount: Number(amount),
        type: type as TransactionType,
        status: TransactionStatus.PENDING,
        userId: req.session.user.id,
        cooperativeId,
        voteId: voteId || null,
        description: description || `CoopLedger payment - ${type}`,
        externalId: String(fedapayTx.id),
      },
    });

    return res.json({ url: token.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Payment initiation failed" });
  }
}

export async function paymentCallback(req: Request, res: Response) {
  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ message: "Invalid webhook payload" });

  try {
    if (status === "approved") {
      const updated = await prisma.transaction.updateMany({
        where: { externalId: String(id), status: TransactionStatus.PENDING },
        data: { status: TransactionStatus.CONFIRMED },
      });
      if (updated.count === 0) {
        console.warn(`Transaction ${id} already processed or not found`);
      }
      // TODO: déclencher worker BullMQ pour générer reçu + blockchain
    } else if (status === "declined" || status === "cancelled") {
      await prisma.transaction.updateMany({
        where: { externalId: String(id), status: TransactionStatus.PENDING },
        data: { status: TransactionStatus.FAILED },
      });
    }
    return res.status(200).send("Webhook received");
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Webhook processing error" });
  }
}