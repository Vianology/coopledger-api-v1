import { ethers } from "ethers";
import { env } from "@/config/env";
import contractAbi from "./contractAbi.json"; // l'ABI complet (tableau d'objets)

const provider = new ethers.JsonRpcProvider(env.POLYGON_RPC_URL);
const systemWallet = new ethers.Wallet(env.SYSTEM_PRIVATE_KEY, provider);

const contract = new ethers.Contract(env.CONTRACT_ADDRESS, contractAbi, systemWallet);

export enum ProofType {
  COTISATION = 0,
  RETRAIT = 1,
  VOTE_RESULT = 2,
}

export async function recordProofOnChain(
  cooperativeId: string,
  receiptHash: string,
  lighthouseCid: string,
  amount: number,
  proofType: ProofType,
) {
  const coopIdBytes32 = ethers.id(cooperativeId);
  const receiptHashBytes32 = receiptHash.startsWith("0x") ? receiptHash : ethers.id(receiptHash);
  const tx = await contract.recordProof(
    coopIdBytes32,
    receiptHashBytes32,
    lighthouseCid,
    BigInt(amount),
    proofType,
  );
  await tx.wait();
  return tx.hash;
}

export async function verifyProofOnChain(lighthouseCid: string): Promise<boolean> {
  return await contract.verifyProof(lighthouseCid);
}