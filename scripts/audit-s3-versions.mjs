import fs from "node:fs";
import { S3Client, ListObjectVersionsCommand } from "@aws-sdk/client-s3";

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^\s*[A-Z0-9_]+=/.test(line))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim().replace(/^['"]|['"]$/g, "")];
    }),
);

const bucket = env.AWS_S3_BUCKET;
const region = env.AWS_REGION || "eu-north-1";
if (!bucket || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_S3_BUCKET and AWS credentials are required in .env");
}

const client = new S3Client({
  region,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

let keyMarker;
let versionIdMarker;
let versions = 0;
let deleteMarkers = 0;
let pages = 0;

do {
  const result = await client.send(
    new ListObjectVersionsCommand({
      Bucket: bucket,
      KeyMarker: keyMarker,
      VersionIdMarker: versionIdMarker,
    }),
  );
  pages += 1;
  versions += result.Versions?.length ?? 0;
  deleteMarkers += result.DeleteMarkers?.length ?? 0;
  keyMarker = result.NextKeyMarker;
  versionIdMarker = result.NextVersionIdMarker;
  if (!result.IsTruncated) break;
} while (true);

console.log(JSON.stringify({ region, pages, versions, deleteMarkers }, null, 2));
