import { execFileSync } from "node:child_process";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const forbidden = trackedFiles.filter((file) => {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  return (
    /\.(keystore|jks|p12|pfx)$/.test(normalized) ||
    normalized === "android/app/key.properties" ||
    /(^|\/)(id_rsa|id_ecdsa|id_ed25519)$/.test(normalized)
  );
});

if (forbidden.length > 0) {
  console.error("Sensitive signing or private-key files must not be tracked:");
  for (const file of forbidden) console.error(`- ${file}`);
  process.exit(1);
}

console.log("Sensitive file check passed.");
