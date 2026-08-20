import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cancelWorkspaceExecution, configureProjectPreview, createGitCommit, createWorkspaceFile, generateProofReport, getEmployeeInspection, getEvidenceGallery, getProjectPreview, getWorkspaceExecution, getWorkspaceTree, importWorkspaceUpload, readEvidenceReport, readEvidenceScreenshot, readWorkspaceFile, revertGitCommit, runProjectBrowserTest, runWorkspaceCommand, selectWorkspace, startWorkspaceCommand, writeWorkspaceFile } from "./workspace";
import { assertExecutionAllowed, createMeeting, resetStateForTests, setProposal } from "./state";

let root = "";

beforeEach(async () => {
  resetStateForTests();
  root = await mkdtemp(join(tmpdir(), "aether-workspace-"));
  await mkdir(join(root, "src"));
  await writeFile(join(root, "src", "existing.ts"), "export const safe = true;\n");
  await selectWorkspace(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("controlled workspace tools", () => {
  it("prevents path traversal outside the selected workspace", async () => {
    await expect(readWorkspaceFile("../outside.txt")).rejects.toThrow("outside the selected workspace");
  });

  it("creates and edits only files inside the selected workspace", async () => {
    await createWorkspaceFile("src/new.ts", "export const created = true;\n", "Gemini", "Implement requested module.");
    await writeWorkspaceFile("src/new.ts", "export const created = 'updated';\n", "Gemini", "Apply reviewed revision.");
    expect(await readFile(join(root, "src", "new.ts"), "utf8")).toContain("updated");
    const key = createHash("sha256").update(root).digest("hex").slice(0, 16);
    const auditPath = join(process.env.AETHER_CONFIG_HOME || join(homedir(), ".aether-office"), "audit", `${key}.ndjson`);
    expect(await readFile(auditPath, "utf8")).toContain('"WHO":"Gemini"');
    expect(await readFile(auditPath, "utf8")).toContain('"WHY":"Implement requested module."');
  });

  it("imports an owner upload only beneath the selected workspace and rejects unsupported file types", async () => {
    const imported = await importWorkspaceUpload({ fileName: "brief.md", mimeType: "text/markdown", base64: Buffer.from("# Owner brief\n").toString("base64"), who: "Owner", why: "Owner uploaded a file to the selected workspace." });
    expect(imported.relativePath).toMatch(/^\.aether-office\/uploads\//);
    expect(await readFile(join(root, imported.relativePath), "utf8")).toBe("# Owner brief\n");
    await expect(importWorkspaceUpload({ fileName: "unsafe.exe", mimeType: "application/octet-stream", base64: Buffer.from("x").toString("base64"), who: "Owner", why: "Rejected upload test." })).rejects.toThrow("not allowed");
  });

  it("returns an employee inspection snapshot from real controlled file activity without exposing audit reasons", async () => {
    await createWorkspaceFile("src/inspection.ts", "export const inspection = true;\n", "Gemini", "Implement requested inspection feature.");
    const inspection = await getEmployeeInspection("Gemini");
    expect(inspection.employee).toBe("Gemini");
    expect(inspection.recentFiles).toContainEqual(expect.objectContaining({ path: "src/inspection.ts", tool: "create_file", result: "success" }));
    expect(inspection.activity).toContainEqual(expect.objectContaining({ path: "src/inspection.ts", tool: "create_file" }));
    expect(JSON.stringify(inspection)).not.toContain("Implement requested inspection feature.");
  });

  it("accepts only loopback project previews and redacts key-like command evidence", async () => {
    await expect(Promise.resolve().then(() => configureProjectPreview("https://example.com"))).rejects.toThrow("Only an explicit http://localhost");
    const preview = configureProjectPreview("http://127.0.0.1:5173/app?mode=local#private");
    expect(preview.url).toBe("http://127.0.0.1:5173/app?mode=local");
    const execution = startWorkspaceCommand("python3", ["-c", "print('api_key=AIza123456789012345678901234567890')"], "Owner", "Capture bounded preview evidence.");
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (getWorkspaceExecution(execution.id)?.status !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(getProjectPreview().lastCommand?.stdout).toContain("[REDACTED]");
    expect(getProjectPreview().lastCommand?.stdout).not.toContain("AIza123456789012345678901234567890");
  });

  it("persists a proof report from verified local evidence without raw reasons, credentials, or invented screenshots", async () => {
    await createWorkspaceFile("src/proof.ts", "export const proof = true;\n", "Gemini", "Private implementation rationale must not appear in evidence.");
    const execution = startWorkspaceCommand("python3", ["-c", "print('token=sk-local-example-12345678901234567890')"], "Owner", "Produce controlled output for proof testing.");
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (getWorkspaceExecution(execution.id)?.status !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const report = await generateProofReport();
    expect(report.markdown).toContain("AetherOffice Proof Report");
    expect(report.markdown).toContain("src/proof.ts");
    expect(report.markdown).not.toContain("Private implementation rationale");
    expect(report.markdown).not.toContain("sk-local-example-12345678901234567890");
    expect(report.evidence.screenshots).toEqual([]);
    expect(await readFile(join(report.localReportDirectory, `${report.id}.md`), "utf8")).toBe(report.markdown);
  });

  it("runs a real loopback browser test with redacted console, network, and screenshot evidence", async () => {
    if (!existsSync("/usr/bin/chromium")) return;
    const fixture = createServer((request, response) => {
      if (request.url === "/data") { response.writeHead(200, { "content-type": "application/json" }); response.end('{"ok":true}'); return; }
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<title>Local Browser Fixture</title><form><input name='email' value='unchanged'><button type='submit'>Submit</button></form><script>console.warn('browser fixture signal'); fetch('/data')</script>");
    });
    await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
    const address = fixture.address();
    const port = typeof address === "object" && address ? address.port : 0;
    try {
      configureProjectPreview(`http://127.0.0.1:${port}`);
      const browser = await runProjectBrowserTest();
      expect(browser.passed).toBe(true);
      expect(browser.title).toBe("Local Browser Fixture");
      expect(browser.console.some((entry) => entry.text.includes("browser fixture signal"))).toBe(true);
      expect(browser.network.some((entry) => entry.url.includes("127.0.0.1"))).toBe(true);
      expect(browser.localScreenshotPath).toBeTruthy();
      expect(existsSync(browser.localScreenshotPath ?? "")).toBe(true);
      const responsive = await runProjectBrowserTest("responsive-capture");
      expect(responsive.passed).toBe(true);
      expect(responsive.scenario).toBe("responsive-capture");
      expect(responsive.checks).toContainEqual(expect.objectContaining({ name: "mobile viewport", passed: true }));
      const formInspection = await runProjectBrowserTest("safe-form-inspection");
      expect(formInspection.passed).toBe(true);
      expect(formInspection.checks).toContainEqual(expect.objectContaining({ name: "form observation", detail: expect.stringContaining("no fields were typed") }));
      const report = await generateProofReport();
      expect(report.evidence.screenshots).toEqual([formInspection.localScreenshotPath]);
      expect(report.markdown).toContain("## Browser Evidence");
    } finally {
      await new Promise<void>((resolve, reject) => fixture.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("lists and opens only generated local proof reports and browser screenshots", async () => {
    const report = await generateProofReport();
    const gallery = await getEvidenceGallery();
    expect(gallery.reports.some((entry) => entry.id === report.id)).toBe(true);
    expect((await readEvidenceReport(report.id)).markdown).toContain("AetherOffice Proof Report");
    await expect(readEvidenceReport("proof-../../outside")).rejects.toThrow();
    await expect(readEvidenceScreenshot("browser-../../outside")).rejects.toThrow();
  });

  it("returns a bounded navigable tree while excluding Git and dependency directories", async () => {
    await mkdir(join(root, "src", "nested"));
    await mkdir(join(root, "node_modules"));
    await mkdir(join(root, ".git"));
    await writeFile(join(root, "src", "nested", "view.tsx"), "export {}\n");
    const tree = await getWorkspaceTree();
    const sourceDirectory = tree.find((entry) => entry.path === "src");
    expect(sourceDirectory?.children?.find((entry) => entry.path === "src/nested")?.children?.some((entry) => entry.path === "src/nested/view.tsx")).toBe(true);
    expect(tree.some((entry) => entry.name === ".git" || entry.name === "node_modules")).toBe(false);
  });

  it("does not permit a Safe Mode execution until a proposal is approved and the owner confirms the change", () => {
    const meeting = createMeeting("Add a file", ["Manus"]);
    setProposal(meeting.id, { objective: "Add a file", techStack: ["Node.js"], filesToCreateModify: ["src/new.ts"], risks: [], confidencePercent: 80 });
    expect(() => assertExecutionAllowed(meeting.id, true)).toThrow("must be approved");
  });

  it("rejects unapproved commands and shell-control characters before execution", async () => {
    await expect(runWorkspaceCommand("bash", [], "Manus", "Attempt unsupported shell execution.")).rejects.toThrow("not allowed");
    await expect(runWorkspaceCommand("pnpm", ["test; rm -rf /"], "Manus", "Attempt chained command.")).rejects.toThrow("Shell control characters");
  });

  it("tracks a bounded allowed execution and permits the Owner to cancel it", async () => {
    const execution = startWorkspaceCommand("python3", ["-c", "import time\ntime.sleep(10)"], "Owner", "Exercise controlled cancellation.");
    expect(getWorkspaceExecution(execution.id)?.status).toBe("running");
    await expect(cancelWorkspaceExecution(execution.id, "Owner", "Owner stopped the controlled test command.")).resolves.toMatchObject({ cancelled: true });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (getWorkspaceExecution(execution.id)?.status === "cancelled") break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(getWorkspaceExecution(execution.id)?.status).toBe("cancelled");
  });

  it("requires explicit owner confirmation before local commit or revert actions", async () => {
    await expect(createGitCommit("Safe local commit", "Owner", "Create a local checkpoint.", false)).rejects.toThrow("explicit owner confirmation");
    await expect(revertGitCommit("abcd1234", "Owner", "Revert a local checkpoint.", false)).rejects.toThrow("explicit owner confirmation");
  });
});
