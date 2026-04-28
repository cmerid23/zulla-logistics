import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Spec env vars: CF_ACCOUNT_ID / R2_ACCESS_KEY / R2_SECRET_KEY / R2_BUCKET.
// Accept legacy R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY too.
const accountId = process.env.CF_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID ?? "";
const accessKeyId = process.env.R2_ACCESS_KEY ?? process.env.R2_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.R2_SECRET_KEY ?? process.env.R2_SECRET_ACCESS_KEY ?? "";
const bucket = process.env.R2_BUCKET ?? "zulla-docs";

const client = new S3Client({
  region: "auto",
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: { accessKeyId, secretAccessKey },
});

// ----- Spec-named functions -----

export async function uploadToR2(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType?: string,
): Promise<string> {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }),
  );
  return key;
}

export async function getPresignedUploadUrl(
  key: string,
  expiresIn = 600,
  contentType?: string,
): Promise<string> {
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 600): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export async function deleteR2Object(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// ----- Object form retained for existing callers (r2.putObject / r2.signedUrl etc.) -----

export const r2 = {
  client,
  bucket,
  putObject: uploadToR2,
  deleteObject: deleteR2Object,
  signedUrl: getPresignedDownloadUrl,
  presignedUploadUrl: (key: string, contentType: string, expiresIn = 600) =>
    getPresignedUploadUrl(key, expiresIn, contentType),
};
