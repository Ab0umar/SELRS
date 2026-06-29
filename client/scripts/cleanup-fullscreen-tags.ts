// file: client/scripts/cleanup-fullscreen-tags.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagesDir = path.resolve(__dirname, "../src/pages");

function cleanFile(filePath: string) {
  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;
  // Remove stray closing tags
  content = content.split("</FullScreenLayout>").join("");
  // Fix "void foo(...</FullScreenLayout>)" patterns
  content = content.replace(/\((\s*)<\/FullScreenLayout>(\s*)\)/g, "()");
  // Remove any leftover solitary "(</FullScreenLayout>)"
  content = content.replace(/\(<\/FullScreenLayout>\)/g, "()");
  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`Cleaned ${path.basename(filePath)}`);
  }
}

fs.readdirSync(pagesDir).forEach((file) => {
  const fullPath = path.join(pagesDir, file);
  const stat = fs.statSync(fullPath);
  if (stat.isFile() && file.endsWith(".tsx")) {
    cleanFile(fullPath);
  }
});
console.log("Cleanup completed.");
