import { describe, expect, it, beforeEach } from "vitest";
import { applyProposalAction, createMeeting, getDashboardState, isEmployeeActive, resetStateForTests, setApprovalMode, setProposal } from "./state";

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
});
