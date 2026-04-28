import { eq } from "drizzle-orm";
import { db, documents } from "@zulla/db";
import type { AuthUser, DocumentType } from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { r2 } from "../lib/r2.js";

interface UploadInput {
  file: Express.Multer.File;
  type: DocumentType;
  loadId?: string | null;
  carrierId?: string | null;
  uploadedByUserId: string;
}

interface RecordInput {
  type: DocumentType;
  r2Key: string;
  filename: string;
  fileSizeBytes?: number | null;
  loadId?: string | null;
  carrierId?: string | null;
  uploadedByUserId: string;
}

export const documentService = {
  async upload(input: UploadInput) {
    const safeName = input.file.originalname.replace(/[^\w.\-]+/g, "_");
    const key = `docs/${Date.now()}-${safeName}`;
    await r2.putObject(key, input.file.buffer, input.file.mimetype);

    const [created] = await db
      .insert(documents)
      .values({
        type: input.type,
        loadId: input.loadId ?? null,
        carrierId: input.carrierId ?? null,
        uploadedByUserId: input.uploadedByUserId,
        filename: input.file.originalname,
        fileSizeBytes: input.file.size,
        r2Key: key,
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to save document");
    return created;
  },

  /** Record a document row that points at a key already uploaded via presigned URL. */
  async recordUploaded(input: RecordInput) {
    const [created] = await db
      .insert(documents)
      .values({
        type: input.type,
        r2Key: input.r2Key,
        filename: input.filename,
        fileSizeBytes: input.fileSizeBytes ?? null,
        loadId: input.loadId ?? null,
        carrierId: input.carrierId ?? null,
        uploadedByUserId: input.uploadedByUserId,
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to record document");
    return created;
  },

  async getDownloadUrl(id: string, _user: AuthUser): Promise<string> {
    const doc = await db.query.documents.findFirst({ where: eq(documents.id, id) });
    if (!doc) throw new HttpError(404, "Document not found");
    return r2.signedUrl(doc.r2Key);
  },

  async remove(id: string, _user: AuthUser): Promise<void> {
    const doc = await db.query.documents.findFirst({ where: eq(documents.id, id) });
    if (!doc) throw new HttpError(404, "Document not found");
    await r2.deleteObject(doc.r2Key);
    await db.delete(documents).where(eq(documents.id, id));
  },
};
