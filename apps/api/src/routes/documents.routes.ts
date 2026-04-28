import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { documentTypeSchema } from "@zulla/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { documentService } from "../services/document.service.js";
import { r2 } from "../lib/r2.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

export const documentsRouter: Router = Router();

// Carrier onboarding may need a presign before the user is authenticated. The
// presigned URL is short-lived and scoped to a known key prefix, so this is safe.
const presignSchema = z.object({
  type: documentTypeSchema,
  filename: z.string().min(1).max(256),
  contentType: z.string().min(1).max(128),
  scope: z.enum(["onboarding", "load", "carrier"]).default("onboarding"),
});

documentsRouter.post("/presign", optionalAuth, validate(presignSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof presignSchema>;
    const safeName = body.filename.replace(/[^\w.\-]+/g, "_");
    const key = `${body.scope}/${body.type}/${Date.now()}-${safeName}`;
    const uploadUrl = await r2.presignedUploadUrl(key, body.contentType);
    res.json({ ok: true, data: { key, uploadUrl, expiresIn: 600 } });
  } catch (err) {
    next(err);
  }
});

documentsRouter.use(requireAuth());

// Server-side multipart upload (alternative to presigned client upload).
documentsRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: { message: "file is required" } });
    }
    const typeParse = documentTypeSchema.safeParse(req.body.type);
    if (!typeParse.success) {
      return res.status(400).json({
        ok: false,
        error: { message: "Invalid document type", details: typeParse.error.flatten() },
      });
    }
    const doc = await documentService.upload({
      file: req.file,
      type: typeParse.data,
      loadId: (req.body.loadId as string) ?? null,
      carrierId: (req.body.carrierId as string) ?? null,
      uploadedByUserId: req.user!.id,
    });
    res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// Persist a document row that points at an already-uploaded R2 key.
const recordSchema = z.object({
  type: documentTypeSchema,
  r2Key: z.string().min(1),
  filename: z.string().min(1),
  fileSizeBytes: z.number().int().positive().optional(),
  loadId: z.string().uuid().optional(),
  carrierId: z.string().uuid().optional(),
});

// Spec uses bare POST /. /record retained as alias for existing callers.
documentsRouter.post("/", validate(recordSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof recordSchema>;
    const doc = await documentService.recordUploaded({
      type: body.type,
      r2Key: body.r2Key,
      filename: body.filename,
      fileSizeBytes: body.fileSizeBytes ?? null,
      loadId: body.loadId ?? null,
      carrierId: body.carrierId ?? null,
      uploadedByUserId: req.user!.id,
    });
    res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    next(err);
  }
});

documentsRouter.post("/record", validate(recordSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof recordSchema>;
    const doc = await documentService.recordUploaded({
      type: body.type,
      r2Key: body.r2Key,
      filename: body.filename,
      fileSizeBytes: body.fileSizeBytes ?? null,
      loadId: body.loadId ?? null,
      carrierId: body.carrierId ?? null,
      uploadedByUserId: req.user!.id,
    });
    res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    next(err);
  }
});

documentsRouter.get("/by-load/:loadId", async (req, res, next) => {
  try {
    const { eq } = await import("drizzle-orm");
    const { db, documents } = await import("@zulla/db");
    const rows = await db.select().from(documents).where(eq(documents.loadId, req.params.loadId as string));
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

documentsRouter.get("/by-carrier/:carrierId", async (req, res, next) => {
  try {
    const { eq } = await import("drizzle-orm");
    const { db, documents } = await import("@zulla/db");
    const rows = await db.select().from(documents).where(eq(documents.carrierId, req.params.carrierId as string));
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

documentsRouter.get("/:id/url", async (req, res, next) => {
  try {
    const url = await documentService.getDownloadUrl(req.params.id as string, req.user!);
    res.json({ ok: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

documentsRouter.delete("/:id", async (req, res, next) => {
  try {
    await documentService.remove(req.params.id as string, req.user!);
    res.json({ ok: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
