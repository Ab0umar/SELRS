import { createHash } from "node:crypto";
export function marketingUsageId(
  parent: string,
  workload: "marketing.text" | "marketing.image",
) {
  const hash = createHash("sha256")
    .update(`${parent}:${workload}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
