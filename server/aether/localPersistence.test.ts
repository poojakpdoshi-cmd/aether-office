import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalConfigHome = process.env.AETHER_CONFIG_HOME;
let configHome = "";

afterEach(() => {
  if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
  else process.env.AETHER_CONFIG_HOME = originalConfigHome;
  if (configHome) rmSync(configHome, { recursive: true, force: true });
  configHome = "";
  vi.resetModules();
});

describe("local runtime persistence", () => {
  it("reloads task meetings, approvals, and activity from the local runtime file without a database", async () => {
    configHome = mkdtempSync(join(tmpdir(), "aether-local-runtime-"));
    process.env.AETHER_CONFIG_HOME = configHome;

    const firstRuntime = await import("./state");
    firstRuntime.resetStateForTests();
    firstRuntime.setApprovalMode("Team Mode");
    const meeting = firstRuntime.createMeeting("Implement a local-only task history", ["Manus", "Gemini"]);
    firstRuntime.setProposal(meeting.id, {
      objective: "Implement a local-only task history",
      techStack: ["TypeScript"],
      filesToCreateModify: ["server/aether/state.ts"],
      risks: ["Do not persist provider secrets in runtime state"],
      confidencePercent: 86,
    });
    firstRuntime.applyProposalAction(meeting.id, "Approve");

    vi.resetModules();
    const reloadedRuntime = await import("./state");
    const dashboard = reloadedRuntime.getDashboardState();

    expect(dashboard.approvalMode).toBe("Team Mode");
    expect(dashboard.meetings.find((item) => item.id === meeting.id)).toMatchObject({ state: "APPROVED" });
    expect(dashboard.activities.some((event) => event.kind === "approval" && event.message.includes("Approve"))).toBe(true);
  });
});
