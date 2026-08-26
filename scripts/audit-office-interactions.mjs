import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.AETHER_OFFICE_AUDIT_URL ?? "http://127.0.0.1:3000";
const localOwnerToken = process.env.AETHER_OFFICE_AUDIT_OWNER_TOKEN;
const researchTimeoutMs = Number.parseInt(process.env.AETHER_OFFICE_AUDIT_RESEARCH_TIMEOUT_MS ?? "90000", 10);
const outputDirectory = "/home/ubuntu/office-interaction-audit";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const findings = [];
const expectedArtworkSource = {
  metro: "aetheroffice-office-no-manager-cabin_a8a18332.png",
  warm: "aether-office-animation-warm-japanese_5ef01a17.png",
  stealth: "aether-office-animation-stealth_b907737c.png",
};
const expectedRoomTargets = ["Gemini", "DeepSeek", "Mistral", "SambaNova", "Grok", "North Mini Code", "Devstral Small 2", "Nemotron 3 Ultra"];
const expectedComputerTargets = ["Manus", ...expectedRoomTargets];

function record(name, passed, detail) {
  findings.push({ name, passed, detail });
  if (!passed) throw new Error(`${name}: ${detail}`);
}

try {
  await mkdir(outputDirectory, { recursive: true });
  const launchUrl = localOwnerToken ? `${baseUrl}/?localOwner=${encodeURIComponent(localOwnerToken)}` : baseUrl;
  await page.goto(launchUrl, { waitUntil: "networkidle" });
  await page.locator("#office-animation-style").waitFor();
  record("animation selector visible", true, "The top-right selector is present.");
  const mapTargetLabels = await page.locator(".office-map-overlay button").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")).filter(Boolean));
  const expectedMapTargets = [
    "Open DeepDiscuss Room",
    "Open Test Lab",
    "Open Lounge",
    "Inspect Central Corridor",
    "Open the lower office management page",
    ...expectedRoomTargets.map((employee) => `Enter ${employee}'s room`),
    ...expectedComputerTargets.map((employee) => `Open ${employee}'s computer live work`),
  ];
  record("complete map target inventory", expectedMapTargets.every((target) => mapTargetLabels.includes(target)), `Found ${mapTargetLabels.length} labelled map controls, including all expected room and computer targets.`);

  if (process.env.AETHER_OFFICE_AUDIT_OWNER_SESSION === "1" && localOwnerToken) {
    await page.locator(".office-task-input").fill("hello");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByText("Hello sir! I'm the manager of AetherOffice. How can I help you today?").waitFor();
    record("manager greeting route", true, "The manager returns the local greeting without starting research.");
    await page.locator(".office-task-input").fill("Plan a local availability calculator");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByText("I understand the task. First, we will hold a manager meeting and send the agreed conclusion to the configured team for research. I will bring back one owner-reviewable plan. No work starts until you approve it.").waitFor();
    record("manager task-proposal route", true, "A substantive task becomes an approval-gated proposal without starting research.");
    if (process.env.AETHER_OFFICE_AUDIT_RESEARCH === "1") {
      await page.getByRole("button", { name: "Start manager meeting & research" }).click();
      await page.getByRole("button", { name: "Approve plan & allow work" }).waitFor({ timeout: Number.isFinite(researchTimeoutMs) ? researchTimeoutMs : 90_000 });
      record("provider-backed research route", true, "The configured available team produced an owner-reviewable plan.");
      await page.getByRole("button", { name: "Approve plan & allow work" }).click();
      await page.getByText("Approval recorded").waitFor();
      record("owner approval route", true, "Approval was recorded without claiming any workspace or sandbox work occurred.");
    }
  } else {
    findings.push({ name: "manager greeting route", passed: true, detail: "Not mutated in the anonymous browser audit because manager messages require a local-owner session; dedicated manager-chat regressions cover the local greeting behavior." });
    findings.push({ name: "manager task-proposal route", passed: true, detail: "Not mutated in the anonymous browser audit because task proposals require a local-owner session." });
  }

  for (const style of ["metro", "warm", "stealth"]) {
    await page.locator("#office-animation-style").selectOption(style);
    await page.waitForFunction((expectedStyle) => document.querySelector(".text-free-office")?.classList.contains(`office-animation-${expectedStyle}`), style);
    await page.waitForFunction((expectedSource) => {
      const image = document.querySelector("img.real-office-backdrop");
      return Boolean(image?.getAttribute("src")?.includes(expectedSource) && image.complete && image.naturalWidth > 0);
    }, expectedArtworkSource[style], { timeout: 15_000 });
    const artwork = await page.locator("img.real-office-backdrop").evaluate((image) => ({ source: image.getAttribute("src"), complete: image.complete, width: image.naturalWidth }));
    record(`${style} artwork loaded`, artwork.complete && artwork.width > 0, `Source: ${artwork.source ?? "missing"}; natural width: ${artwork.width}.`);
    const activeAnimation = await page.locator("img.real-office-backdrop").evaluate((image) => getComputedStyle(image).animationName);
    record(`${style} ambient animation active`, activeAnimation === `office-${style}-drift`, `Active image animation: ${activeAnimation}.`);
    const visibleSceneMotion = await page.locator(".real-office-stage").evaluate(async (stage) => {
      const animation = getComputedStyle(stage, "::before").animationName;
      const before = getComputedStyle(stage, "::before").transform;
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      const after = getComputedStyle(stage, "::before").transform;
      return { animation, before, after };
    });
    record(`${style} visible scene-light motion`, visibleSceneMotion.animation === `office-${style}-worklight` && visibleSceneMotion.before !== visibleSceneMotion.after, `Active scene light: ${visibleSceneMotion.animation}; transform changed: ${visibleSceneMotion.before !== visibleSceneMotion.after}.`);
    await page.screenshot({ path: `${outputDirectory}/${style}-desktop.png`, fullPage: false });
  }

  await page.locator("#office-animation-style").selectOption("stealth");
  await page.reload({ waitUntil: "networkidle" });
  record("animation selection persists", await page.locator("#office-animation-style").inputValue() === "stealth", "The Stealth night selection survives a reload.");
  await page.locator("#office-animation-style").selectOption("metro");

  for (const style of ["metro", "warm", "stealth"]) {
    await page.locator("#office-animation-style").selectOption(style);
    await page.getByRole("button", { name: "Enter Gemini's room" }).click({ position: { x: 20, y: 20 } });
    await page.getByRole("heading", { name: "Gemini's Room" }).waitFor();
    record(`${style} employee room route`, true, `Gemini's cabin opens its named room under the ${style} style.`);
    await page.getByRole("button", { name: "Back to office" }).click();

    await page.getByRole("button", { name: "Open Gemini's computer live work" }).click();
    await page.getByRole("heading", { name: "Gemini's Computer" }).waitFor();
    record(`${style} employee computer route`, true, `Gemini's laptop opens the named authorized monitor under the ${style} style.`);
    await page.getByRole("button", { name: "Back to office" }).click();
  }

  for (const employee of expectedRoomTargets) {
    await page.getByRole("button", { name: `Enter ${employee}'s room` }).click({ position: { x: 10, y: 10 } });
    await page.getByRole("heading", { name: `${employee}'s Room` }).waitFor();
    await page.getByRole("button", { name: "Back to office" }).click();
  }
  record("all employee room routes", true, "Every named non-manager cabin opens its corresponding room.");

  for (const employee of expectedComputerTargets) {
    await page.getByRole("button", { name: `Open ${employee}'s computer live work` }).click();
    await page.getByRole("heading", { name: `${employee}'s Computer` }).waitFor();
    await page.getByRole("button", { name: "Back to office" }).click();
  }
  record("all employee computer routes", true, "Every named laptop opens its corresponding authorized monitor.");

  await page.getByRole("button", { name: "Open DeepDiscuss Room" }).click();
  await page.getByRole("heading", { name: "DeepDiscuss Room" }).waitFor();
  record("DeepDiscuss room route", true, "The room target opens the meeting detail view without starting a meeting.");
  await page.getByRole("button", { name: "Back to office" }).click();

  await page.getByRole("button", { name: "Open the lower office management page" }).click();
  await page.getByRole("heading", { name: "Employees, keys & settings" }).waitFor();
  record("service-floor route", true, "The empty-floor target opens the lower management page.");
  await page.getByRole("button", { name: "Close office lower management page" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#office-animation-style").waitFor();
  record("mobile selector visible", await page.locator("#office-animation-style").isVisible(), "The selector remains visible at 390 × 844.");
  for (const style of ["metro", "warm", "stealth"]) {
    await page.locator("#office-animation-style").selectOption(style);
    await page.waitForFunction((expectedSource) => {
      const image = document.querySelector("img.real-office-backdrop");
      return Boolean(image?.getAttribute("src")?.includes(expectedSource) && image.complete && image.naturalWidth > 0);
    }, expectedArtworkSource[style], { timeout: 15_000 });
    record(`${style} mobile artwork loaded`, true, `The ${style} visual direction loads at 390 × 844.`);
    await page.screenshot({ path: `${outputDirectory}/${style}-mobile.png`, fullPage: false });
  }
  await writeFile(`${outputDirectory}/summary.json`, `${JSON.stringify({ baseUrl, findings }, null, 2)}\n`);
  console.log(JSON.stringify({ baseUrl, findings, outputDirectory }, null, 2));
} finally {
  await browser.close();
}
