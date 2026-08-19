import { REVIEW_RUBRIC, type EmployeeId } from "../../shared/aether";
import { recordCompletedTask } from "./state";

export type EvaluationInput = {
  correctness: number;
  requirements: number;
  codeQuality: number;
  security: number;
  performance: number;
  maintainability: number;
  reasoning: string;
  recommendations: string;
};

export function evaluateImplementation(employee: EmployeeId, input: EvaluationInput) {
  const bounded = (value: number) => Math.min(100, Math.max(0, value));
  const score = Math.round(
    bounded(input.correctness) * (REVIEW_RUBRIC.Correctness / 100) +
    bounded(input.requirements) * (REVIEW_RUBRIC.Requirements / 100) +
    bounded(input.codeQuality) * (REVIEW_RUBRIC["Code Quality"] / 100) +
    bounded(input.security) * (REVIEW_RUBRIC.Security / 100) +
    bounded(input.performance) * (REVIEW_RUBRIC.Performance / 100) +
    bounded(input.maintainability) * (REVIEW_RUBRIC.Maintainability / 100)
  );
  recordCompletedTask(employee, score);
  return { score, reasoning: input.reasoning, recommendations: input.recommendations, rubric: REVIEW_RUBRIC };
}
