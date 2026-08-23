// Tailwind v4's PostCSS plugin (@tailwindcss/postcss) runs its output through
// Lightning CSS during optimize/minify, which rewrites every
// `@media (max-width: Npx)` / `(min-width: Npx)` into the Media Queries
// Level 4 range syntax `(width<=Npx)` / `(width>=Npx)`. That syntax needs
// Chrome/WebView 104+ (mid-2022) — on an older Android System WebView the
// whole @media block is unrecognized and silently never applies, which is
// why every mobile-responsive rule in the app was invisible inside the
// native app while working fine in an up-to-date browser.
//
// No PluginOptions on @tailwindcss/postcss expose a browser target, so this
// rewrites the range syntax back to the legacy form in every built CSS file
// as a post-build step instead.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const assetsDir = join(process.cwd(), "dist", "public", "assets");

let filesChanged = 0;
let totalReplacements = 0;

for (const name of readdirSync(assetsDir)) {
  if (!name.endsWith(".css")) continue;
  const filePath = join(assetsDir, name);
  const original = readFileSync(filePath, "utf8");
  let count = 0;
  const fixed = original
    .replace(/width<=([0-9.]+(?:px|rem|em|vw|vh|%))/g, (_m, unit) => {
      count++;
      return `max-width:${unit}`;
    })
    .replace(/width>=([0-9.]+(?:px|rem|em|vw|vh|%))/g, (_m, unit) => {
      count++;
      return `min-width:${unit}`;
    });
  if (count > 0) {
    writeFileSync(filePath, fixed);
    filesChanged++;
    totalReplacements += count;
    console.log(`[fix-legacy-media-queries] ${name}: ${count} rewritten`);
  }
}

console.log(
  `[fix-legacy-media-queries] done — ${totalReplacements} media queries fixed across ${filesChanged} file(s).`,
);
