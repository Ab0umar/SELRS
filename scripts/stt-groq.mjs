import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const [audioDir] = process.argv.slice(2);
if (!audioDir || !process.env.GROQ_API_KEY?.trim()) {
  console.error('Set GROQ_API_KEY in .env, then run: node --env-file=.env scripts/stt-groq.mjs "C:\\Recordings"');
  process.exit(1);
}
const extensions = new Set([".mp3", ".m4a", ".wav", ".webm", ".ogg", ".mp4", ".mpeg", ".mpga", ".flac"]);
const files = (await readdir(audioDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && extensions.has(extname(entry.name).toLowerCase()))
  .map((entry) => entry.name).sort();
if (!files.length) {
  console.error("No supported audio files found.");
  process.exit(1);
}
const output = join(audioDir, "_results_groq");
await mkdir(output, { recursive: true });
const summary = ["# Groq transcription comparison\n"];
let succeeded = 0;
let failed = 0;
for (const file of files) {
  summary.push(`## ${file}\n`);
  const path = join(audioDir, file);
  if ((await stat(path)).size > 25 * 1024 * 1024) {
    summary.push("FAILED: File exceeds the free-tier 25 MB upload limit.\n");
    console.error(`FAILED: ${file}: file too large`);
    failed++;
    continue;
  }
  const bytes = await readFile(path);
  for (const model of ["whisper-large-v3", "whisper-large-v3-turbo"]) {
    console.log(`Transcribing ${file} with ${model} ...`);
    const started = performance.now();
    try {
      const form = new FormData();
      form.append("file", new Blob([bytes]), basename(path));
      form.append("model", model);
      form.append("language", "ar");
      form.append("temperature", "0");
      form.append("response_format", "verbose_json");
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}` },
        body: form,
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      const data = await response.json();
      if (typeof data.text !== "string" || !data.text.trim()) throw new Error("No speech returned");
      const seconds = ((performance.now() - started) / 1000).toFixed(2);
      const duration = typeof data.duration === "number" ? `; audio duration: ${data.duration.toFixed(2)} seconds` : "";
      await writeFile(join(output, `${file}.${model}.txt`), data.text, "utf8");
      summary.push(`### ${model}\n\nRequest time: ${seconds} seconds${duration}\n\n${data.text}\n`);
      console.log(`OK: ${model}: ${seconds} seconds`);
      succeeded++;
    } catch (error) {
      failed++;
      summary.push(`### ${model}\n\nFAILED: ${error.message}\n`);
      console.error(`FAILED: ${file}: ${model}: ${error.message}`);
    }
  }
}
await writeFile(join(output, "summary.md"), summary.join("\n"), "utf8");
console.log(`Succeeded: ${succeeded}; failed: ${failed}. Results: ${join(output, "summary.md")}`);
process.exitCode = failed ? 1 : 0;
