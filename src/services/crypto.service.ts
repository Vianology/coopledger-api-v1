import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/config/env.js";

const ALGORITHM = env.ALGORITHM; // "aes-256-gcm"
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":");
  if (!ivHex || !encryptedHex) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function encryptWithKey(data: Buffer | string, hexKey: string) {
  const iv = randomBytes(16);
  const key = Buffer.from(hexKey, "hex");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encryptedData: encrypted, iv: iv.toString("hex"), tag: tag.toString("hex") };
}

export function decryptWithKey(encryptedData: Buffer, hexKey: string, ivHex: string, tagHex: string) {
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const key = Buffer.from(hexKey, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

export function generateCoopKey(): string {
  return randomBytes(32).toString("hex");
}

export function encryptFile(file: Express.Multer.File) {
  return encryptWithKey(file.buffer, ENCRYPTION_KEY.toString("hex"));
}

export function decryptFile(encryptedData: Buffer, ivHex: string, tagHex: string) {
  return decryptWithKey(encryptedData, ENCRYPTION_KEY.toString("hex"), ivHex, tagHex);
}