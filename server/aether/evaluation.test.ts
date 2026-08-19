import { describe, expect, it } from "vitest";
import { evaluateImplementation } from "./evaluation";

describe("AetherOffice evaluation rubric", () => {
  it("uses the required scoring weights exactly", () => {
    const evaluation = evaluateImplementation("Arcee", { correctness: 100, requirements: 0, codeQuality: 0, security: 0, performance: 0, maintainability: 0, reasoning: "Test", recommendations: "Test" });
    expect(evaluation.score).toBe(30);
    expect(evaluation.rubric).toMatchObject({ Correctness: 30, Requirements: 20, "Code Quality": 20, Security: 10, Performance: 10, Maintainability: 10 });
  });
});
