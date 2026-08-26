import { describe, expect, it, vi } from "vitest";
import { classifyTaskCapabilities, mayContinueAfterRoundFailure, parseProposal, providerAvailabilityNotice, remainingRoundEmployees, runConcurrentRoundJobs, selectEmployeesForTask, selectLatencyPrioritySynthesisEmployees, selectSynthesisEmployee, settleConcurrentRoundJobs, withProviderRoundDeadline } from "./deepDiscuss";
import { provisionOpenRouterProfiles, resetStateForTests, setTemporaryUntilForTests } from "./state";

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

  it("allows synthesis after an all-failed debate only when genuine earlier research exists", () => {
    expect(mayContinueAfterRoundFailure("analysis", 3)).toBe(false);
    expect(mayContinueAfterRoundFailure("debate", 0)).toBe(false);
    expect(mayContinueAfterRoundFailure("debate", 3)).toBe(true);
  });

  it("skips duplicate worker profiles after their shared provider has a verified failure", async () => {
    const attempted: string[] = [];
    const outcomes = await settleConcurrentRoundJobs(["Gemini", "Gemini Worker 1", "Gemini Worker 2"], async (employee) => {
      attempted.push(employee);
      throw new Error("configured provider unavailable");
    });
    expect(attempted).toEqual(["Gemini"]);
    expect(outcomes.map((outcome) => outcome.status)).toEqual(["rejected", "skipped", "skipped"]);
  });

  it("renders one provider availability notice without duplicate worker-profile names", () => {
    const notice = providerAvailabilityNotice(new Set(["Gemini", "Gemini Worker 1", "Gemini Worker 2"]));
    expect(notice).toContain("Gemini did not respond");
    expect(notice).not.toContain("Worker");
  });

  it("classifies task domains before selecting role-aligned employees", () => {
    expect(classifyTaskCapabilities("Make the login page secure and faster")).toEqual(expect.arrayContaining(["frontend", "security", "backend"]));
    expect(selectEmployeesForTask("Make the login page secure and faster")).toEqual(expect.arrayContaining(["Manus", "Gemini", "DeepSeek"]));
  });

  it("prefers latency-priority active contributors for synthesis with ordered fallback", () => {
    resetStateForTests();
    expect(selectLatencyPrioritySynthesisEmployees([{ employee: "DeepSeek" }, { employee: "Gemini" }, { employee: "SambaNova" }])).toEqual(["SambaNova", "Gemini", "DeepSeek"]);
  });

  it("uses a successful dynamically provisioned OpenRouter worker when no named employee contributed", () => {
    resetStateForTests();
    const [worker] = provisionOpenRouterProfiles("openrouter/free", 1).created;
    expect(selectLatencyPrioritySynthesisEmployees([{ employee: worker!.id }])).toEqual([worker!.id]);
  });

  it("bounds a slow provider response so the round can settle and continue", async () => {
    vi.useFakeTimers();
    try {
      const outcome = expect(withProviderRoundDeadline(new Promise<string>(() => undefined), "Gemini", "analysis")).rejects.toThrow("latency budget");
      await vi.advanceTimersByTimeAsync(12_000);
      await outcome;
    } finally {
      vi.useRealTimers();
    }
  });

  it("limits concurrent calls that share one configured provider while allowing different providers to proceed", async () => {
    let activeMistral = 0;
    let maximumMistral = 0;
    const outcomes = await settleConcurrentRoundJobs(["Mistral", "Mistral Worker 1", "Mistral Worker 2", "Gemini"], async (employee) => {
      const isMistral = employee.startsWith("Mistral");
      if (isMistral) {
        activeMistral += 1;
        maximumMistral = Math.max(maximumMistral, activeMistral);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (isMistral) activeMistral -= 1;
      return `${employee} complete`;
    });
    expect(maximumMistral).toBe(2);
    expect(outcomes.every((outcome) => outcome.status === "fulfilled")).toBe(true);
  });
});
