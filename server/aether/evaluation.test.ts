import { beforeEach, describe, expect, it } from "vitest";
import { evaluateImplementation } from "./evaluation";
import { getDashboardState, resetStateForTests } from "./state";

describe("AetherOffice evaluation rubric", () => {
  beforeEach(() => resetStateForTests());

  it("uses the required scoring weights exactly", () => {
    const evaluation = evaluateImplementation("DeepSeek", { correctness: 100, requirements: 0, codeQuality: 0, security: 0, performance: 0, maintainability: 0, reasoning: "Test", recommendations: "Test" });
    expect(evaluation.score).toBe(30);
    expect(evaluation.rubric).toMatchObject({ Correctness: 30, Requirements: 20, "Code Quality": 20, Security: 10, Performance: 10, Maintainability: 10 });
  });

  it("records real task count, average score, and recent performance for the evaluated employee", () => {
    evaluateImplementation("DeepSeek", { correctness: 80, requirements: 80, codeQuality: 80, security: 80, performance: 80, maintainability: 80, reasoning: "Verified review", recommendations: "Ship after approval" });
    const profile = getDashboardState().employees.find((employee) => employee.id === "DeepSeek");
    expect(profile).toMatchObject({ taskCount: 1, averageScore: 80, recentPerformance: [80] });
  });
});
