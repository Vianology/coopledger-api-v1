import { v2 as cloudinary } from "cloudinary";
import { PinataSDK } from "pinata";
import { env } from "@/config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const pinata = new PinataSDK({ pinataJwt: env.PINATA_JWT });
export { cloudinary };