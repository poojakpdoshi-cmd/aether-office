import { describe, expect, it, vi } from "vitest";
import { classifyTaskCapabilities, parseProposal, remainingRoundEmployees, runConcurrentRoundJobs, selectEmployeesForTask, selectLatencyPrioritySynthesisEmployees, selectSynthesisEmployee, settleConcurrentRoundJobs, withProviderRoundDeadline } from "./deepDiscuss";
import { resetStateForTests, setTemporaryUntilForTests } from "./state";

describe("DeepDiscuss selection and proposal parsing", () => {
  it("selects only relevant staff for a frontend security task", () => {
    const selected = selectEmployeesForTask("Build a React login screen and review authentication security.");
    expect(selected).toEqual(expect.arrayContaining(["Manus", "Gemini", "DeepSeek", "Mistral"]));
    expect(selected).not.toContain("Grok");
  });

  it("accepts only complete structured TEAM PROPOSAL data", () => {
    const proposal = parseProposal(JSON.stringify({
      objective: "Create project settings",
      techStack: ["React", "Node.js"],
      filesToCreateModify: ["client/src/pages/Settings.tsx"],
      risks: ["Secret exposure"],
      confidencePercent: 91,
    }), "Fallback");
    expect(proposal.confidencePercent).toBe(91);
    expect(proposal.filesToCreateModify).toHaveLength(1);
  });

  it("rejects incomplete proposal JSON instead of fabricating a plan", () => {
    expect(() => parseProposal('{"objective":"Only title"}', "Fallback")).toThrow("incomplete TEAM PROPOSAL");
  });

  it("uses an active discussion teammate for synthesis after temporary Manus expires", () => {
    resetStateForTests();
    setTemporaryUntilForTests("Manus", Date.now() - 1);
    expect(selectSynthesisEmployee([{ employee: "Mistral" }, { employee: "Gemini" }])).toBe("Mistral");
  });

  it("starts independent employee work in parallel while keeping result order deterministic", async () => {
    const employees = ["Manus", "Gemini", "Mistral"] as const;
    const started: string[] = [];
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const work = runConcurrentRoundJobs([...employees], async (employee) => {
      started.push(employee);
      await gate;
      return `${employee}-complete`;
    });
    await Promise.resolve();
    expect(started).toEqual([...employees]);
    release?.();
    await expect(work).resolves.toEqual(["Manus-complete", "Gemini-complete", "Mistral-complete"]);
  });

  it("keeps successful settled provider work when another provider fails", async () => {
    const outcomes = await settleConcurrentRoundJobs(["Gemini", "Mistral"], async (employee) => {
      if (employee === "Mistral") throw new Error("fixture provider unavailable");
      return "verified Gemini contribution";
    });
    expect(outcomes[0]).toMatchObject({ status: "fulfilled", value: "verified Gemini contribution" });
    expect(outcomes[1]).toMatchObject({ status: "rejected" });
  });

  it("does not retry a provider with a verified failure in later discussion rounds", () => {
    expect(remainingRoundEmployees(["Manus", "Gemini", "Mistral"], new Set(["Gemini"]))).toEqual(["Manus", "Mistral"]);
  });

  it("classifies task domains before selecting role-aligned employees", () => {
    expect(classifyTaskCapabilities("Make the login page secure and faster")).toEqual(expect.arrayContaining(["frontend", "security", "backend"]));
    expect(selectEmployeesForTask("Make the login page secure and faster")).toEqual(expect.arrayContaining(["Manus", "Gemini", "DeepSeek"]));
  });

  it("prefers latency-priority active contributors for synthesis with ordered fallback", () => {
    resetStateForTests();
    expect(selectLatencyPrioritySynthesisEmployees([{ employee: "DeepSeek" }, { employee: "Gemini" }, { employee: "SambaNova" }])).toEqual(["SambaNova", "Gemini", "DeepSeek"]);
  });

  it("bounds a slow provider response so the round can settle and continue", async () => {
    vi.useFakeTimers();
    try {
      const outcome = expect(withProviderRoundDeadline(new Promise<string>(() => undefined), "Gemini", "analysis")).rejects.toThrow("latency budget");
      await vi.advanceTimersByTimeAsync(6_000);
      await outcome;
    } finally {
      vi.useRealTimers();
    }
  });
});
