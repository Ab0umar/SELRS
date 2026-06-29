// file: client/scripts/batch-wrap-pages.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagesDir = path.resolve(__dirname, "../src/pages");

function wrapFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  // Skip if already uses FullScreenLayout
  if (content.includes("FullScreenLayout")) return;
  // Find the first export default function declaration
  const exportDefaultRegex = /export default function (\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/m;
  const match = exportDefaultRegex.exec(content);
  if (!match) return;
  const funcName = match[1];
  const funcBody = match[2];
  // Wrap the return JSX with FullScreenLayout
  const newBody = funcBody.replace(/return\s*\(([\s\S]*?)\);/, (m, jsx) => {
    const wrapped = `return (<FullScreenLayout>${jsx}</FullScreenLayout>);`;
    return wrapped;
  });
  const importLine = "import FullScreenLayout from \"../components/FullScreenLayout\";";
  let newContent = content;
  // Insert import after other imports (simple heuristic)
  newContent = newContent.replace(/(import[^;]+;\s*){2,}/, (m) => `${m}\n${importLine}\n`);
  // Replace function body
  newContent = newContent.replace(funcBody, newBody);
  fs.writeFileSync(filePath, newContent, "utf-8");
  console.log(`Wrapped ${path.basename(filePath)}`);
}

fs.readdirSync(pagesDir).forEach((file) => {
  const fullPath = path.join(pagesDir, file);
  const stat = fs.statSync(fullPath);
  if (stat.isFile() && file.endsWith(".tsx")) {
    wrapFile(fullPath);
  }
});

console.log("Batch wrap completed.");
