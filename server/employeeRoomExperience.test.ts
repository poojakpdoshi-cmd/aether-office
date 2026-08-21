import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const experience = readFileSync(fileURLToPath(new URL("../client/src/components/EmployeeRoomExperience.tsx", import.meta.url)), "utf8");
const home = readFileSync(fileURLToPath(new URL("../client/src/pages/Home.tsx", import.meta.url)), "utf8");
const chatbox = readFileSync(fileURLToPath(new URL("../client/src/components/OfficeControlChatbox.tsx", import.meta.url)), "utf8");

describe("immersive employee room experience", () => {
  it("shows an employee working in a room before an explicit computer-monitor interaction", () => {
    expect(experience).toContain("EmployeeRoomScene");
    expect(experience).toContain("Open real computer monitor");
    expect(home).toContain('<EmployeeRoomScene employee={relatedEmployee} onOpenComputer={() => setOfficeFocus(`${relatedEmployee.name} Computer`)} />');
  });

  it("renders only real isolated process and sandbox evidence in the computer monitor", () => {
    expect(experience).toContain("EmployeeComputerMonitor");
    expect(experience).toContain("No real sandbox process has run for this employee yet.");
    expect(experience).toContain("No host terminal fallback is permitted.");
    expect(experience).toContain("Only actual container process data is rendered here. There is no simulated shell session.");
    expect(experience).not.toContain("runEmployeeSandboxCommand");
  });

  it("makes the seven-day temporary Manus role and manager continuity clear in the side rail", () => {
    expect(home).toContain("Manus is a temporary primary orchestrator");
    expect(home).toContain("Atlas, Nova, and Sentinel will continue");
    expect(chatbox).toContain("manusLifecycle");
  });
});
