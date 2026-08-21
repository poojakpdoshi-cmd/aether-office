import { describe, expect, it } from "vitest";
import { selectEmployeesForTask } from "./deepDiscuss";
import { getEmployeeProvider } from "./providers";
import { getDashboardState, provisionOpenRouterProfiles, resetStateForTests } from "./state";

describe("Guardian and shared OpenRouter profile workflow", () => {
  it("seeds the bounded Guardian as a real built-in orchestrator", () => {
    resetStateForTests();
    const guardian = getDashboardState().employees.find((employee) => employee.id === "Sentinel");
    expect(guardian).toMatchObject({ role: "Guardian Orchestrator · Real-error oversight", provider: "manus", status: "IDLE" });
    expect(selectEmployeesForTask("Fix a failing test")).toContain("Sentinel");
  });

  it("creates distinct OpenRouter profiles from one gateway identity while retaining model selection on each profile", () => {
    resetStateForTests();
    const result = provisionOpenRouterProfiles("openrouter/free", 2);
    expect(result.created).toHaveLength(2);
    expect(result.created.every((employee) => employee.provider === "openrouter" && employee.model === "openrouter/free")).toBe(true);
    expect(getEmployeeProvider(result.created[0]!.id)).toBe("openrouter");
  });

  it("rejects arbitrary model strings rather than treating user text as a route", () => {
    resetStateForTests();
    expect(() => provisionOpenRouterProfiles("openrouter/free; rm -rf /", 1)).toThrow("valid OpenRouter model identifier");
  });
});
