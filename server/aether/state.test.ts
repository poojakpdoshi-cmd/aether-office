import { describe, expect, it, beforeEach } from "vitest";
import { applyProposalAction, createMeeting, getDashboardState, getEmployeeRoom, getEmployeeSandbox, isEmployeeActive, provisionEmployees, resetStateForTests, setApprovalMode, setEmployeeSandboxStatus, setEmployeeStatus, setProposal, setTemporaryUntilForTests } from "./state";

describe("AetherOffice owner approvals", () => {
  beforeEach(() => resetStateForTests());

  it("defaults to Safe Mode and persists an explicit approval-mode change in runtime state", () => {
    expect(getDashboardState().approvalMode).toBe("Safe Mode");
    setApprovalMode("Team Mode");
    expect(getDashboardState().approvalMode).toBe("Team Mode");
  });

  it("does not allow an owner action before a structured proposal exists", () => {
    const meeting = createMeeting("Build a secure dashboard", ["Manus"]);
    expect(() => applyProposalAction(meeting.id, "Approve")).toThrow("A proposal must exist");
  });

  it("records the exact owner approval action only after a proposal exists", () => {
    const meeting = createMeeting("Build a secure dashboard", ["Manus"]);
    setProposal(meeting.id, {
      objective: "Build a secure dashboard",
      techStack: ["React"],
      filesToCreateModify: ["client/src/pages/Home.tsx"],
      risks: ["Existing layout contracts"],
      confidencePercent: 82,
    });
    const result = applyProposalAction(meeting.id, "Modify Plan", "Add accessibility checks.");
    expect(result.state).toBe("CHANGES_REQUESTED");
    expect(getDashboardState().activities.some((activity) => activity.message.includes("Modify Plan"))).toBe(true);
  });

  it("removes temporary Manus at expiry and reports the assignment end to the Owner", () => {
    const afterSevenDays = Date.now() + 8 * 24 * 60 * 60 * 1000;
    expect(isEmployeeActive("Manus", afterSevenDays)).toBe(false);
    const dashboard = getDashboardState(afterSevenDays);
    expect(dashboard.employees.some((employee) => employee.id === "Manus")).toBe(false);
    expect(dashboard.expiredTemporaryEmployees).toContain("Manus");
  });

  it("provisions only a bounded number of distinct local employees for a provider", () => {
    const first = provisionEmployees("gemini", 2);
    expect(first.created.map((employee) => employee.id)).toEqual(["Gemini Worker 1", "Gemini Worker 2"]);
    expect(() => provisionEmployees("gemini", 6)).toThrow("between 1 and 5");
    const second = provisionEmployees("gemini", 1);
    expect(second.created[0]?.id).toBe("Gemini Worker 3");
    expect(getDashboardState().employees.filter((employee) => employee.provider === "gemini")).toHaveLength(4);
  });

  it("assigns every employee a stable distinct room and sandbox ownership record", () => {
    const geminiRoom = getEmployeeRoom("Gemini");
    const mistralRoom = getEmployeeRoom("Mistral");
    const geminiSandbox = getEmployeeSandbox("Gemini");
    const mistralSandbox = getEmployeeSandbox("Mistral");
    expect(geminiRoom.id).not.toBe(mistralRoom.id);
    expect(geminiSandbox.volumeName).not.toBe(mistralSandbox.volumeName);
    expect(geminiSandbox.containerName).not.toBe(mistralSandbox.containerName);
    expect(geminiSandbox.workspacePath).toBe("/workspace");
    expect(setEmployeeSandboxStatus("Gemini", "runtime-unavailable", "Docker Desktop or Podman is required.")).toMatchObject({ status: "runtime-unavailable" });
  });

  it("treats the exact temporaryUntil boundary as expired across dashboard and state updates", () => {
    const boundary = 1_800_000_000_000;
    setTemporaryUntilForTests("Manus", boundary);
    expect(isEmployeeActive("Manus", boundary - 1)).toBe(true);
    expect(isEmployeeActive("Manus", boundary)).toBe(false);
    const dashboard = getDashboardState(boundary);
    expect(dashboard.employees.some((employee) => employee.id === "Manus")).toBe(false);
    expect(dashboard.expiredTemporaryEmployees).toContain("Manus");
    expect(() => setEmployeeStatus("Manus", "CODING", boundary)).toThrow("no longer active");
  });
});
