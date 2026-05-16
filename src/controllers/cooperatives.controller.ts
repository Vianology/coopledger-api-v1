import { MembershipGrade, MembershipRole, MembershipStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { cloudinary, pinata } from "@/utils/storage.js";
import { encrypt, generateCoopKey, encryptWithKey } from "@/services/crypto.service.js";
import { prisma } from "@/utils/prisma.js";

class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

// Helper pour upload Pinata depuis Buffer
async function uploadToPinata(buffer: Buffer, filename: string): Promise<string> {
  const file = new File([buffer], filename, { type: "application/octet-stream" });
  const result = await pinata.upload.public.file(file);
  return result.cid;
}

export async function createCooperative(req: Request, res: Response) {
  const { name, description, founders, latitude, longitude } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const logo = files?.logo?.[0];
  const statusDoc = files?.status_document?.[0];
  const proofDoc = files?.proof_document?.[0];
  const identityDoc = files?.identity_document?.[0];
  const businessPlanDoc = files?.business_plan_document?.[0];

  if (!name || !description || !founders || !statusDoc || !proofDoc || !identityDoc) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const coopKey = generateCoopKey();
  const encryptedCoopKey = encrypt(coopKey); // stocké chiffré avec clé maître

  const encryptedStatus = encryptWithKey(statusDoc.buffer, coopKey);
  const encryptedProof = encryptWithKey(proofDoc.buffer, coopKey);
  const encryptedIdentity = encryptWithKey(identityDoc.buffer, coopKey);
  const encryptedBusinessPlan = businessPlanDoc ? encryptWithKey(businessPlanDoc.buffer, coopKey) : null;

  try {
    const [statusCid, proofCid, identityCid, businessCid] = await Promise.all([
      uploadToPinata(encryptedStatus.encryptedData, statusDoc.originalname),
      uploadToPinata(encryptedProof.encryptedData, proofDoc.originalname),
      uploadToPinata(encryptedIdentity.encryptedData, identityDoc.originalname),
      encryptedBusinessPlan ? uploadToPinata(encryptedBusinessPlan.encryptedData, businessPlanDoc.originalname) : Promise.resolve(null),
    ]);

    let logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
    if (logo) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "cooperatives", public_id: logo.originalname.split(".")[0] },
          (error, result) => (error ? reject(error) : resolve(result))
        ).end(logo.buffer);
      });
      logoUrl = uploadResult.secure_url;
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdCoop = await tx.cooperative.create({
        data: {
          name,
          description,
          logo: logoUrl,
          founders: JSON.parse(founders as string),
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          encryptionKey: encryptedCoopKey,
          creatorId: req.session.user.id,
          statusDocumentCid: statusCid,
          proofDocumentCid: proofCid,
          identityDocumentCid: identityCid,
          businessPlanDocumentCid: businessCid,
        },
      });

      await tx.membership.create({
        data: {
          userId: req.session.user.id,
          cooperativeId: createdCoop.id,
          status: MembershipStatus.ACCEPTED,
          grade: MembershipGrade.ADMIN,
          role: MembershipRole.FARMER,
        },
      });

      return createdCoop;
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getCooperatives(req: Request, res: Response) {
  const { lat, lng, radius = 15 } = req.query;
  const cooperatives = await prisma.cooperative.findMany({
    where: { status: "ACTIVE" },
  });

  if (lat && lng) {
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const rad = parseFloat(radius as string);
    const filtered = cooperatives.filter(coop => {
      if (!coop.latitude || !coop.longitude) return false;
      const R = 6371; // km
      const dLat = (coop.latitude - userLat) * Math.PI / 180;
      const dLng = (coop.longitude - userLng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(userLat * Math.PI/180) * Math.cos(coop.latitude * Math.PI/180) * Math.sin(dLng/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      return distance <= rad;
    });
    return res.json(filtered);
  }
  return res.json(cooperatives);
}

export async function joinCooperative(req: Request, res: Response) {
  const { cooperativeId } = req.body;
  if (!cooperativeId) return res.status(400).json({ message: "cooperativeId missing" });

  try {
    const membership = await prisma.$transaction(async (tx) => {
      const coop = await tx.cooperative.findUnique({ where: { id: cooperativeId } });
      if (!coop) throw new HttpError(404, "Cooperative not found");

      const existing = await tx.membership.findUnique({
        where: { userId_cooperativeId: { userId: req.session.user.id, cooperativeId } },
      });
      if (existing) throw new HttpError(409, "Membership already exists or pending");

      return tx.membership.create({
        data: {
          userId: req.session.user.id,
          cooperativeId,
          status: MembershipStatus.PENDING,
          grade: MembershipGrade.MEMBER,
          role: MembershipRole.FARMER,
        },
      });
    });
    return res.status(201).json(membership);
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Internal error" });
  }
}

export async function approveCooperativeJoin(req: Request, res: Response) {
  const { cooperativeId, memberId, isApproved } = req.body;
  if (!cooperativeId || !memberId || isApproved === undefined) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const requester = await tx.membership.findUnique({
        where: { userId_cooperativeId: { userId: req.session.user.id, cooperativeId } },
      });
      if (!requester || requester.grade !== MembershipGrade.ADMIN) {
        throw new HttpError(403, "Only admin can approve");
      }

      const membership = await tx.membership.findUnique({
        where: { userId_cooperativeId: { userId: memberId, cooperativeId } },
      });
      if (!membership) throw new HttpError(404, "Membership not found");
      if (membership.status !== MembershipStatus.PENDING) {
        throw new HttpError(409, "Already processed");
      }

      await tx.membership.update({
        where: { userId_cooperativeId: { userId: memberId, cooperativeId } },
        data: { status: isApproved ? MembershipStatus.ACCEPTED : MembershipStatus.REJECTED },
      });
    });
    return res.json({ message: "Membership updated" });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: "Internal error" });
  }
}