/**
 * Storage — AWS S3 implementation
 * Replaces the Manus storage proxy with real S3 uploads.
 *
 * Required environment variables:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_S3_BUCKET
 *   AWS_S3_REGION (default: us-east-1)
 *   AWS_S3_PUBLIC_URL (optional CDN prefix)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

function getS3Client(): S3Client {
  const region = process.env.AWS_S3_REGION || "us-east-1";
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET environment variable is not set");
  return bucket;
}

function getPublicUrl(key: string): string {
  const cdnPrefix = process.env.AWS_S3_PUBLIC_URL;
  if (cdnPrefix) return `${cdnPrefix.replace(/\/$/, "")}/${key}`;
  const region = process.env.AWS_S3_REGION || "us-east-1";
  const bucket = getBucket();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = getBucket();
  const key = relKey.replace(/^\/+/, "");
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return { key, url: getPublicUrl(key) };
}

export async function storageDelete(relKey: string): Promise<void> {
  const client = getS3Client();
  const bucket = getBucket();
  const key = relKey.replace(/^\/+/, "");
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  return { key, url: getPublicUrl(key) };
}
