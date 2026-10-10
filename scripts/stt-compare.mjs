// Usage: node scripts/stt-compare.mjs <audioDir> [model1,model2,...]
// Transcribes every audio file in <audioDir> with each model and writes
// <audioDir>/_results/<file>.<model>.txt plus a side-by-side summary.md.
// Reads OPENAI_API_KEY from the environment (.env via --env-file).
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const AUDIO_EXT = new Set([".mp3", ".m4a", ".wav", ".webm", ".ogg", ".mp4", ".mpeg", ".mpga"]);
const PRICE_PER_MIN = {
  "gpt-4o-mini-transcribe": 0.003,
  "gpt-4o-transcribe": 0.006,
  "gpt-4o-transcribe-diarize": 0.006,
};

const [audioDir, modelArg] = process.argv.slice(2);
if (!audioDir) {
  console.error("Usage: node --env-file=.env scripts/stt-compare.mjs <audioDir> [models]");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}
const models = modelArg ? modelArg.split(",") : Object.keys(PRICE_PER_MIN);

async function transcribe(model, filePath) {
  const form = new FormData();
  form.append("file", new Blob([await readFile(filePath)]), basename(filePath));
  form.append("model", model);
  form.append("language", "ar");
  if (model.includes("diarize")) {
    form.append("response_format", "diarized_json");
    form.append("chunking_strategy", "auto");
  }
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`);
  if (!model.includes("diarize")) return (await res.json()).text;
  const data = await res.json();
  return (data.segments ?? []).map((s) => `[${s.speaker}] ${s.text}`).join("\n");
}

const outDir = join(audioDir, "_results");
await mkdir(outDir, { recursive: true });
const files = (await readdir(audioDir)).filter((f) => AUDIO_EXT.has(extname(f).toLowerCase()));
if (!files.length) {
  console.error(`No audio files in ${audioDir}`);
  process.exit(1);
}

let summary = "# STT comparison\n\n";
for (const file of files) {
  summary += `## ${file}\n\n`;
  for (const model of models) {
    try {
      const text = await transcribe(model, join(audioDir, file));
      await writeFile(join(outDir, `${file}.${model}.txt`), text, "utf8");
      summary += `### ${model}\n\n${text}\n\n`;
      console.log(`ok   ${file} ${model}`);
    } catch (err) {
      summary += `### ${model}\n\nFAILED: ${err.message}\n\n`;
      console.error(`fail ${file} ${model}: ${err.message}`);
    }
  }
}
await writeFile(join(outDir, "summary.md"), summary, "utf8");
console.log(`Done. Open ${join(outDir, "summary.md")}`);
