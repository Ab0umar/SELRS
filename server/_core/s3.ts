import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`[S3] Missing env var: ${key}`);
  }
  return value || defaultValue || "";
}

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const accessKeyId = getEnvVar("AWS_ACCESS_KEY_ID");
    const secretAccessKey = getEnvVar("AWS_SECRET_ACCESS_KEY");
    const region = getEnvVar("AWS_REGION", "me-central-1");

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<void> {
  const bucket = getEnvVar("AWS_S3_BUCKET");
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await client.send(command);
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const bucket = getEnvVar("AWS_S3_BUCKET");
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const response = await client.send(command);
  const chunks: Uint8Array[] = [];
  const reader = response.Body as any;
  for await (const chunk of reader) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function listObjectsInS3(prefix = ""): Promise<Array<{ key: string; size: number; lastModified: Date | null }>> {
  const bucket = getEnvVar("AWS_S3_BUCKET");
  const client = getS3Client();
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix || undefined,
  });
  const response = await client.send(command);
  return (response.Contents ?? [])
    .map((item) => ({
      key: String(item.Key ?? "").trim(),
      size: Number(item.Size ?? 0),
      lastModified: item.LastModified ?? null,
    }))
    .filter((item) => Boolean(item.key));
}

export async function deleteFromS3(key: string): Promise<void> {
  const bucket = getEnvVar("AWS_S3_BUCKET");
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await client.send(command);
}

export async function copyObjectInS3(sourceKey: string, destinationKey: string): Promise<void> {
  const bucket = getEnvVar("AWS_S3_BUCKET");
  const client = getS3Client();
  const command = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, "/")}`,
    Key: destinationKey,
  });
  await client.send(command);
}
