import { chromium } from "playwright-core";

const outDir = "C:/Users/user/AppData/Local/Temp/claude/c--Users-user-Desktop-Client-Projects-contract-eye-view/b53f9ba6-3868-4f96-9154-c9aa2e12eaf0/scratchpad";
const base = "http://localhost:8084";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (err) => console.log("PAGEERROR", err.message));

// 1. Anonymous pricing page
await page.goto(base + "/pricing", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/pricing-anon.png` });
console.log("saved pricing-anon");

await browser.close();
