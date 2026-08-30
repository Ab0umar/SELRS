import { chromium } from "@playwright/test";

const BASE = "http://localhost:4000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.locator('input[type="text"]').fill("استقبال");
await page.locator('input[type="password"]').fill("258288");
await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 20000 });

let resp = null;
page.on("response", async (res) => {
  if (res.url().includes("getSuggestedOperationType")) {
    try { resp = await res.text(); } catch {}
  }
});

await page.goto(BASE + "/sheets/lasik/23/followup", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
console.log("URL:", page.url());
console.log("API response:", resp);

const opDateInputValue = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll("input"));
  const dateInput = inputs.find((i) => i.placeholder === "يوم/شهر/سنة");
  return dateInput ? dateInput.value : "no date input found";
});
console.log("date input value:", opDateInputValue);
await page.screenshot({ path: ".scratch/followup-date.png", fullPage: true });

await browser.close();
