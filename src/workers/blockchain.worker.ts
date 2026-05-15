import { Worker } from "bullmq";
import { prisma } from "@/utils/prisma";
import { blockchainQueue } from "@/utils/queue";
import { ProofType, recordProofOnChain } from "@/services/blockchain.service";
import { encryptWithKey } from "@/services/crypto.service";
import { pinata } from "@/utils/storage";
import { createHash } from "node:crypto";
import { decrypt } from "@/services/crypto.service"; // pour déchiffrer la clé de la coop

const worker = new Worker(
  "blockchain-transactions",
  async (job) => {
    const { txId } = job.data;
    console.log(`Processing transaction ${txId}...`);

    const tx = await prisma.transaction.findUnique({
      where: { id: txId },
      include: { cooperative: true, user: true },
    });

    if (!tx || tx.status !== "PENDING") {
      console.log(`Transaction ${txId} not found or already processed`);
      return;
    }

    // 1. Récupérer la clé de la coopérative (déchiffrée)
    const coop = tx.cooperative;
    if (!coop || !coop.encryptionKey) {
      throw new Error(`Cooperative ${tx.cooperativeId} has no encryption key`);
    }
    const coopKey = decrypt(coop.encryptionKey); // clé maître déchiffrée

    // 2. Générer le reçu JSON
    const receipt = {
      transactionId: tx.id,
      externalId: tx.externalId,
      type: tx.type,
      amount: tx.amount,
      userId: tx.userId,
      cooperativeId: tx.cooperativeId,
      voteId: tx.voteId,
      timestamp: new Date().toISOString(),
    };
    const receiptBuffer = Buffer.from(JSON.stringify(receipt), "utf-8");

    // 3. Chiffrer avec la clé de la coopérative
    const encryptedReceipt = encryptWithKey(receiptBuffer, coopKey);

    // 4. Upload sur Pinata
    const file = new File(
      [encryptedReceipt.encryptedData],
      `receipt-${tx.id}.json`,
      { type: "application/octet-stream" }
    );
    const upload = await pinata.upload.public.file(file);
    const cid = upload.cid;

    // 5. Hash du reçu chiffré (SHA256)
    const hash = createHash("sha256").update(encryptedReceipt.encryptedData).digest("hex");

    // 6. Enregistrement sur blockchain
    const proofType = tx.type === "COTISATION" ? ProofType.COTISATION : ProofType.RETRAIT;
    const blockchainTxHash = await recordProofOnChain(
      tx.cooperativeId,
      hash,
      cid,
      tx.amount,
      proofType
    );

    // 7. Mise à jour de la transaction en base
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "CONFIRMED",
        ipfsCid: cid,
        blockchainHash: blockchainTxHash,
        receiptHash: hash,
      },
    });

    console.log(`Transaction ${txId} confirmed on chain: ${blockchainTxHash}`);
  },
  {
    connection: blockchainQueue.opts.connection,
    concurrency: 5,
  }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

export { worker };