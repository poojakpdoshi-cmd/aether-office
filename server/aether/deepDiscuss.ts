import type { DeepDiscussRound, EmployeeId, TeamProposal } from "../../shared/aether";
import {
  addActivity,
  addDiscussionMessage,
  createMeeting,
  failMeeting,
  recordCompletedTask,
  resetEmployeeStatuses,
  setEmployeeStatus,
  setProposal,
} from "./state";
import { getEmployeeProvider, getProviderAdapter, isEmployeeAvailable } from "./providers";

const employeeInstructions: Record<EmployeeId, string> = {
  Manus: "You are Manus, the project manager. Establish scope, constraints, success criteria, and a safe owner-approved implementation path.",
  Gemini: "You are Gemini, lead developer. Focus on frontend, developer experience, implementation boundaries, and practical code changes.",
  Mistral: "You are Mistral, software engineer. Focus on implementation sequencing, maintainability, testability, and possible defects.",
  DeepSeek: "You are DeepSeek, senior engineer. Focus on backend architecture, algorithms, difficult edge cases, and reliability risks.",
  Arcee: "You are Arcee, code and security reviewer. Focus on threat modeling, unsafe assumptions, review criteria, and safeguard gaps.",
  Grok: "You are Grok, technical researcher. Focus on alternatives, dependency risks, integration constraints, and validation research.",
  SambaNova: "You are SambaNova, rapid analysis worker. Focus on concise implementation observations, missing requirements, and rapid risk scans.",
};

export function selectEmployeesForTask(task: string): EmployeeId[] {
  const normalized = task.toLowerCase();
  const selected = new Set<EmployeeId>(["Manus"]);
  if (/ui|frontend|react|css|design|component|landing page|screen/.test(normalized)) selected.add("Gemini");
  if (/algorithm|performance|database|backend|api|architecture|concurrency|debug/.test(normalized)) selected.add("DeepSeek");
  if (/security|auth|permission|review|vulnerab/.test(normalized)) selected.add("Arcee");
  if (/research|compare|alternative|competitor|library|technology/.test(normalized)) selected.add("Grok");
  if (/test|bug|refactor|implement|code|build/.test(normalized)) selected.add("Mistral");

  if (selected.size === 1) selected.add("Mistral");
  return Array.from(selected);
}

export async function runDeepDiscuss(task: string) {
  const requestedEmployees = selectEmployeesForTask(task);
  const selectedEmployees = (await Promise.all(requestedEmployees.map(async (employee) => ({ employee, available: await isEmployeeAvailable(employee) }))))
    .filter((item) => item.available)
    .map((item) => item.employee);
  if (!selectedEmployees.length) throw new Error("No configured provider is available for the selected meeting.");

  const meeting = createMeeting(task, selectedEmployees);
  try {
    for (const employee of selectedEmployees) setEmployeeStatus(employee, "IN_MEETING");
    await runRound(meeting.id, task, selectedEmployees, "analysis", []);

    const analysis = meeting.messages.filter((message) => message.round === "analysis");
    await runRound(meeting.id, task, selectedEmployees, "critique", analysis);

    const critique = meeting.messages.filter((message) => message.round === "critique");
    await runRound(meeting.id, task, selectedEmployees, "debate", [...analysis, ...critique]);

    const proposal = await synthesizePlan(meeting.id, task, meeting.messages);
    setProposal(meeting.id, proposal);
    for (const employee of selectedEmployees) {
      setEmployeeStatus(employee, "COMPLETED");
      recordCompletedTask(employee);
    }
    return meeting;
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepDiscuss failed unexpectedly.";
    failMeeting(meeting.id, message);
    throw error;
  } finally {
    resetEmployeeStatuses();
  }
}

async function runRound(
  meetingId: string,
  task: string,
  employees: EmployeeId[],
  round: Exclude<DeepDiscussRound, "synthesis">,
  previous: Array<{ employee: EmployeeId; content: string }>
) {
  const previousSummary = previous.length
    ? previous.map((message) => `${message.employee}: ${message.content}`).join("\n\n").slice(0, 12000)
    : "No earlier responses are available for this first round.";

  for (const employee of employees) {
    setEmployeeStatus(employee, round === "analysis" ? "THINKING" : "REVIEWING");
    const provider = getEmployeeProvider(employee);
    const adapter = getProviderAdapter(provider);
    addActivity({ kind: "provider", message: `${employee} started ${round}.`, employee });
    const content = await adapter.generate({
      system: `${employeeInstructions[employee]} You are participating in the ${round} round of an owner-approved software planning meeting. Do not claim that files, tests, or tools have run. Be concise, concrete, and cite risks.`,
      user: `Owner task:\n${task}\n\nEarlier team material:\n${previousSummary}\n\nProvide your ${round} contribution.`,
    });
    addDiscussionMessage(meetingId, { employee, provider, round, content });
    addActivity({ kind: "provider", message: `${employee} completed ${round}.`, employee });
  }
}

async function synthesizePlan(meetingId: string, task: string, messages: Array<{ employee: EmployeeId; content: string }>): Promise<TeamProposal> {
  setEmployeeStatus("Manus", "THINKING");
  const source = messages.map((message) => `${message.employee}: ${message.content}`).join("\n\n").slice(0, 16000);
  const adapter = getProviderAdapter("manus");
  const content = await adapter.generate({
    system: "You are Manus, the AI company manager. Create a final owner-reviewable plan. Return strict JSON only with keys objective, techStack, filesToCreateModify, risks, confidencePercent. All arrays contain strings. confidencePercent is an integer from 0 to 100. Do not claim to have changed files or run tests.",
    user: `Owner task:\n${task}\n\nTeam discussion:\n${source}`,
  });
  const proposal = parseProposal(content, task);
  addDiscussionMessage(meetingId, { employee: "Manus", provider: "manus", round: "synthesis", content: JSON.stringify(proposal) });
  return proposal;
}

export function parseProposal(content: string, fallbackObjective: string): TeamProposal {
  const json = content.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Manus did not return a structured TEAM PROPOSAL.");
  const parsed = JSON.parse(json) as Partial<TeamProposal>;
  if (!Array.isArray(parsed.techStack) || !Array.isArray(parsed.filesToCreateModify) || !Array.isArray(parsed.risks)) {
    throw new Error("Manus returned an incomplete TEAM PROPOSAL.");
  }
  return {
    objective: typeof parsed.objective === "string" && parsed.objective.trim() ? parsed.objective : fallbackObjective,
    techStack: parsed.techStack.map(String).slice(0, 12),
    filesToCreateModify: parsed.filesToCreateModify.map(String).slice(0, 30),
    risks: parsed.risks.map(String).slice(0, 12),
    confidencePercent: Math.min(100, Math.max(0, Math.round(Number(parsed.confidencePercent) || 0))),
  };
}
