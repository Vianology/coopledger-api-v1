import { Wallet } from "ethers";
import { prisma } from "@/utils/prisma.js";
import { encrypt } from "./crypto.service.js";

export const onboardUserBlockchain = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Utilisateur introuvable");
  if (user.publicKey) return user;
  const wallet = Wallet.createRandom();
  const encryptedKey = encrypt(wallet.privateKey);
  return await prisma.user.update({
    where: { id: userId },
    data: { publicKey: wallet.address, encryptedPrivateKey: encryptedKey },
  });
};