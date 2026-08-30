import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("server/routers");
const procedurePattern =
  /^(\s*)([A-Za-z_$][\w$]*)\s*:\s*(publicProcedure|protectedProcedure|receptionProcedure|doctorProcedure|managerProcedure|adminProcedure)\b/;
const files = [];

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else if (entry.name.endsWith(".ts")) files.push(fullPath);
  }
}

await walk(root);
const rows = [];
for (const file of files.sort()) {
  const lines = (await fs.readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(procedurePattern);
    if (!match) return;
    rows.push({
      file: path.relative(process.cwd(), file).replaceAll(path.sep, "/"),
      line: index + 1,
      procedure: match[2],
      guard: match[3],
    });
  });
}

const summary = Object.fromEntries(
  [...new Set(rows.map((row) => row.guard))].map((guard) => [
    guard,
    rows.filter((row) => row.guard === guard).length,
  ]),
);

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2));
