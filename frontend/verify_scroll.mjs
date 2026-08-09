import { chromium } from "playwright-core";
import path from "node:path";
const executablePath = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1234", "chrome-win64", "chrome.exe");
const OUT = "C:/Users/Vishal/AppData/Local/Temp/claude/d--MMS--3--MMS/8349f877-63ef-4e9a-9a65-50c7c6cc6707/scratchpad";
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 700 } });
page.on("response", async (res) => {
  if (res.url().includes("prf-groups") || res.url().includes("census")) {
    console.log("RESP", res.url(), res.status());
  }
});
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
const userField = page.locator("#username");
if (await userField.count()) {
  await userField.fill("admin");
  await page.locator("#password").fill("admin123");
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForTimeout(1500);
}
await page.goto("http://localhost:3000/weapon/unit-holding", { waitUntil: "networkidle" });
await page.getByText(/update eqpt data/i).first().click();
await page.waitForTimeout(800);

// Fill Unit field and pick a unit to populate PRF/Census dropdowns, then search
const unitInput = page.getByPlaceholder(/search unit by sus or name/i);
await unitInput.waitFor({ timeout: 15000 });
await unitInput.click();
await unitInput.pressSequentially("44050607", { delay: 30 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/unit-suggest.png` });

// pick first suggestion via portal ul
const firstSuggestion = page.locator('div[style*="position: fixed"] li button').first();
if (await firstSuggestion.count()) {
  await firstSuggestion.click();
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/after-unit-pick.png` });

// PRF Group select (Radix combobox trigger)
await page.waitForTimeout(1000);
const allCombos = await page.getByRole("combobox").all();
for (let i = 0; i < allCombos.length; i++) {
  console.log("combobox", i, await allCombos[i].innerText());
}
const prfTrigger = page.getByRole("combobox").nth(0);
await prfTrigger.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/prf-select-open.png` });
const optCount = await page.getByRole("option").count();
console.log("PRF option count:", optCount);
if (optCount > 0) {
  await page.getByRole("option").first().click();
} else {
  console.log("No PRF options found, aborting flow");
}
await page.waitForTimeout(500);

// Census No select
const censusTrigger = page.getByRole("combobox").nth(1);
await censusTrigger.click();
await page.waitForTimeout(800);
const censusCount = await page.getByRole("option").count();
console.log("Census option count:", censusCount);
if (censusCount > 0) {
  await page.getByRole("option").first().click();
}
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/after-prf-census.png` });

const searchBtn = page.getByRole("button", { name: /^search$/i });
if (await searchBtn.count()) {
  await searchBtn.click();
}
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/after-search.png` });

const info = await page.evaluate(() => {
  const scrollDivs = Array.from(document.querySelectorAll(".overflow-auto"));
  return scrollDivs.map(d => ({
    class: d.className,
    scrollHeight: d.scrollHeight,
    clientHeight: d.clientHeight,
    scrollable: d.scrollHeight > d.clientHeight,
  }));
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
