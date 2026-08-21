import { describe, expect, it } from "vitest";
import { selectEmployeesForTask, selectSynthesisEmployee } from "./deepDiscuss";
import { getDashboardState, resetStateForTests } from "./state";
import { getEmployeeProvider } from "./providers";

describe("orchestrator-manager roster", () => {
  it("persists the three bounded orchestration roles and maps them to the built-in provider", () => {
    resetStateForTests();
    const managers = getDashboardState().employees.filter((employee) => ["Manus", "Atlas", "Nova", "Sentinel"].includes(employee.id));
    expect(managers.map((manager) => manager.id)).toEqual(["Manus", "Atlas", "Nova", "Sentinel"]);
    expect(managers.map((manager) => manager.role)).toEqual(["Temporary CEO · Primary Fast Orchestrator", "Delivery Orchestrator", "Quality Orchestrator", "Guardian Orchestrator · Real-error oversight"]);
    expect(getEmployeeProvider("Atlas")).toBe("manus");
    expect(getEmployeeProvider("Nova")).toBe("manus");
    expect(getEmployeeProvider("Sentinel")).toBe("manus");
  });

  it("adds all active orchestrators to real discussions and gives the primary fast manager synthesis priority", () => {
    resetStateForTests();
    expect(selectEmployeesForTask("Build a responsive settings page")).toEqual(expect.arrayContaining(["Manus", "Atlas", "Nova", "Sentinel", "Gemini"]));
    expect(selectSynthesisEmployee([{ employee: "Atlas" }, { employee: "Nova" }, { employee: "Manus" }])).toBe("Manus");
  });
});
