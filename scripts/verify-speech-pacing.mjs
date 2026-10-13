import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const live = await fetch("https://selrs.cc/");
const policy = live.headers.get("content-security-policy");
assert.ok(policy, "Live CSP is required for this reproduction");
const recorder = await readFile(
  "client/src/components/medical-assistant/FieldDictation.tsx",
  "utf8",
);
assert.match(
  recorder,
  /config\.setProperty\(sdk\.PropertyId\.WebWorkerLoadType,\s*"off"\)/,
  "Recorder must use the verified native-timer option",
);
const bundle = await readFile(
  "node_modules/microsoft-cognitiveservices-speech-sdk/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js",
  "utf8",
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const mode of ["default", "native"]) {
    const page = await browser.newPage();
    await page.route("https://speech-timer.invalid/**", async (route) => {
      if (route.request().url().endsWith("sdk.js"))
        await route.fulfill({
          contentType: "application/javascript",
          body: bundle,
        });
      else
        await route.fulfill({
          contentType: "text/html",
          headers: { "Content-Security-Policy": policy },
          body: '<!doctype html><script src="/sdk.js"></script>',
        });
    });
    await page.goto("https://speech-timer.invalid/");
    const result = await page.evaluate(async (mode) => {
      let blockedWorkers = 0;
      document.addEventListener("securitypolicyviolation", (event) => {
        if (event.blockedURI.startsWith("data")) blockedWorkers++;
      });
      const sdk = window.SpeechSDK;
      const config = sdk.SpeechConfig.fromAuthorizationToken(
        "synthetic-no-api-call",
        "eastus",
      );
      if (mode === "native")
        config.setProperty(sdk.PropertyId.WebWorkerLoadType, "off");
      const stream = sdk.AudioInputStream.createPushStream();
      const recognizer = new sdk.SpeechRecognizer(
        config,
        sdk.AudioConfig.fromStreamInput(stream),
      );
      const started = performance.now();
      const cycles = mode === "native" ? 200 : 1;
      let completed = 0;
      let deadline;
      const outcome = await Promise.race([
        (async () => {
          for (let cycle = 0; cycle < cycles; cycle++) {
            await recognizer.internalData.delay(45);
            completed++;
          }
          return "completed";
        })(),
        new Promise((resolve) => {
          deadline = setTimeout(
            () => resolve("stalled"),
            mode === "native" ? 15000 : 750,
          );
        }),
      ]);
      clearTimeout(deadline);
      try {
        recognizer.close();
      } catch {}
      try {
        stream.close();
      } catch {}
      return {
        outcome,
        completed,
        blockedWorkers,
        elapsedMs: Math.round(performance.now() - started),
      };
    }, mode);
    console.log(JSON.stringify({ browser: "Edge", mode, ...result }));
    assert.equal(result.outcome, mode === "native" ? "completed" : "stalled");
    assert.equal(result.completed, mode === "native" ? 200 : 0);
    assert.equal(result.blockedWorkers > 0, mode === "default");
    await page.close();
  }
} finally {
  await browser.close();
}
