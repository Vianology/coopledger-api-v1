import { env } from "@/config/env.js";

export async function sendWhatsAppOTP(to: string, code: string): Promise<Response> {
  const url = new URL("/send/message", env.GOWA_API_URL);
  const auth = Buffer.from(env.GOWA_API_BASIC_AUTH).toString("base64");
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      phone: `${to}@s.whatsapp.net`,
      message: `Votre code CoopLedger est ${code}. Valable 5 minutes.`,
      mentions: [to],
      duration: 300,
    }),
  });
}