import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGitCommit, createWorkspaceFile, readWorkspaceFile, revertGitCommit, runWorkspaceCommand, selectWorkspace, writeWorkspaceFile } from "./workspace";
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

  it("does not permit a Safe Mode execution until a proposal is approved and the owner confirms the change", () => {
    const meeting = createMeeting("Add a file", ["Manus"]);
    setProposal(meeting.id, { objective: "Add a file", techStack: ["Node.js"], filesToCreateModify: ["src/new.ts"], risks: [], confidencePercent: 80 });
    expect(() => assertExecutionAllowed(meeting.id, true)).toThrow("must be approved");
  });

  it("rejects unapproved commands and shell-control characters before execution", async () => {
    await expect(runWorkspaceCommand("bash", [], "Manus", "Attempt unsupported shell execution.")).rejects.toThrow("not allowed");
    await expect(runWorkspaceCommand("pnpm", ["test; rm -rf /"], "Manus", "Attempt chained command.")).rejects.toThrow("Shell control characters");
  });

  it("requires explicit owner confirmation before local commit or revert actions", async () => {
    await expect(createGitCommit("Safe local commit", "Owner", "Create a local checkpoint.", false)).rejects.toThrow("explicit owner confirmation");
    await expect(revertGitCommit("abcd1234", "Owner", "Revert a local checkpoint.", false)).rejects.toThrow("explicit owner confirmation");
  });
});
