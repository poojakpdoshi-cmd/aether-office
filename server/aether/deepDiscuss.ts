import type { DeepDiscussRound, EmployeeId, TeamProposal } from "../../shared/aether";
import {
  addActivity,
  addDiscussionMessage,
  createMeeting,
  failMeeting,
  isEmployeeActive,
  resetEmployeeStatuses,
  setEmployeeStatus,
  setProposal,
} from "./state";
import { getConfiguredVisionProvider, getEmployeeProvider, getProviderAdapter, isEmployeeAvailable } from "./providers";
import { invokeLLM } from "../_core/llm";

const employeeInstructions: Record<EmployeeId, string> = {
  Manus: "You are Manus, the project manager. Establish scope, constraints, success criteria, and a safe owner-approved implementation path.",
  Gemini: "You are Gemini, lead developer. Focus on frontend, developer experience, implementation boundaries, and practical code changes.",
  Mistral: "You are Mistral, software engineer. Focus on implementation sequencing, maintainability, testability, and possible defects.",
  DeepSeek: "You are DeepSeek, senior engineer. Focus on backend architecture, algorithms, difficult edge cases, and reliability risks.",
  Arcee: "You are Arcee, code and security reviewer. Focus on threat modeling, unsafe assumptions, review criteria, and safeguard gaps.",
  Grok: "You are Grok, technical researcher. Focus on alternatives, dependency risks, integration constraints, and validation research.",
  SambaNova: "You are SambaNova, rapid analysis worker. Focus on concise implementation observations, missing requirements, and rapid risk scans.",
  "North Mini Code": "You are North Mini Code, an agentic coding specialist. Focus on repository-level implementation plans, concise patches, and practical developer workflows.",
  "Devstral Small 2": "You are Devstral Small 2, a software engineering specialist. Focus on reliable code implementation, refactoring order, and testable modular changes.",
  "Nemotron 3 Ultra": "You are Nemotron 3 Ultra, a reasoning and systems specialist. Focus on complex architecture, long-context constraints, tool boundaries, and high-confidence risk analysis.",
};

const DEFAULT_PROVIDER_ROUND_TIMEOUT_MS = 6_000;

function providerRoundTimeoutMs() {
  const configured = Number.parseInt(process.env.AETHER_DEEP_DISCUSS_TIMEOUT_MS || "", 10);
  return Number.isFinite(configured) && configured >= 1_000 && configured <= 60_000 ? configured : DEFAULT_PROVIDER_ROUND_TIMEOUT_MS;
}

export async function withProviderRoundDeadline<T>(operation: Promise<T>, employee: EmployeeId, round: DeepDiscussRound): Promise<T> {
  const timeoutMs = providerRoundTimeoutMs();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${employee} exceeded the ${timeoutMs}ms ${round} round latency budget.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type TaskCapability = "frontend" | "backend" | "security" | "research" | "coding" | "debugging" | "vision" | "general";

const capabilitySignals: Array<{ capability: Exclude<TaskCapability, "general">; signal: RegExp; employees: EmployeeId[] }> = [
  { capability: "frontend", signal: /ui|frontend|react|css|design|component|landing page|page|screen|layout|responsive|form/i, employees: ["Gemini"] },
  { capability: "backend", signal: /algorithm|performance|database|backend|api|architecture|concurrency|server|latency|faster|speed/i, employees: ["DeepSeek"] },
  { capability: "security", signal: /security|auth|permission|review|vulnerab|login|credential|secret/i, employees: ["Arcee"] },
  { capability: "research", signal: /research|compare|alternative|competitor|library|technology|evaluate/i, employees: ["Grok"] },
  { capability: "coding", signal: /test|bug|refactor|implement|code|build|patch|fix/i, employees: ["Mistral"] },
  { capability: "debugging", signal: /debug|error|broken|regression|failure|crash|issue/i, employees: ["DeepSeek", "Mistral"] },
  { capability: "vision", signal: /image|photo|screenshot|visual|mockup|video/i, employees: ["Gemini"] },
];

export function classifyTaskCapabilities(task: string): TaskCapability[] {
  const matched = capabilitySignals.filter((entry) => entry.signal.test(task)).map((entry) => entry.capability);
  return matched.length ? Array.from(new Set(matched)) : ["general"];
}

export function selectEmployeesForTask(task: string): EmployeeId[] {
  const capabilities = new Set(classifyTaskCapabilities(task));
  const selected = new Set<EmployeeId>(["Manus"]);
  for (const rule of capabilitySignals) {
    if (capabilities.has(rule.capability)) rule.employees.forEach((employee) => selected.add(employee));
  }
  if (capabilities.has("general")) selected.add("Mistral");
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
    resetEmployeeStatuses();
    for (const employee of selectedEmployees) setEmployeeStatus(employee, "IN_MEETING");
    const failedEmployees = new Set<EmployeeId>();
    const analysisOutcome = await runRound(meeting.id, task, selectedEmployees, "analysis", []);
    analysisOutcome.failedEmployees.forEach((employee) => failedEmployees.add(employee));

    const analysis = meeting.messages.filter((message) => message.round === "analysis");
    const critiqueOutcome = await runRound(meeting.id, task, selectedEmployees, "critique", analysis);
    critiqueOutcome.failedEmployees.forEach((employee) => failedEmployees.add(employee));

    const critique = meeting.messages.filter((message) => message.round === "critique");
    const debateOutcome = await runRound(meeting.id, task, selectedEmployees, "debate", [...analysis, ...critique]);
    debateOutcome.failedEmployees.forEach((employee) => failedEmployees.add(employee));

    const proposal = await synthesizePlan(meeting.id, task, meeting.messages);
    setProposal(meeting.id, proposal);
    for (const employee of selectedEmployees) {
      if (failedEmployees.has(employee)) {
        setEmployeeStatus(employee, "ERROR");
        addActivity({ kind: "system", message: `${employee} had a provider failure during this meeting. Verified successful contributions remain available for the proposal.`, employee, camera: { fileScope: "No file disclosed", activeTool: "DeepDiscuss", taskStage: "Provider attention needed" } });
      } else {
        setEmployeeStatus(employee, "THINKING");
        addActivity({ kind: "system", message: `${employee} left the Discussion Room and moved to their assigned cabin to prepare the approved work.`, employee, camera: { fileScope: "Planned workspace file", activeTool: "Planning board", taskStage: "Preparing" } });
      }
    }
    return meeting;
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepDiscuss failed unexpectedly.";
    failMeeting(meeting.id, message);
    throw error;
  } finally {
    // Keep the last genuine state visible so the local office can reflect the completed or failed meeting.
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
    addActivity({ kind: "provider", message: `${employee} started ${round}.`, employee, camera: { fileScope: "No file disclosed", activeTool: "DeepDiscuss", taskStage: `Discussing ${round}` } });
  }
  const contributions = await settleConcurrentRoundJobs(employees, async (employee) => {
    const provider = getEmployeeProvider(employee);
    const adapter = getProviderAdapter(provider);
    const content = await withProviderRoundDeadline(adapter.generate({
      system: `${employeeInstructions[employee]} You are participating in the ${round} round of an owner-approved software planning meeting. Do not claim that files, tests, or tools have run. Be concise, concrete, and cite risks.`,
      user: `Owner task:\n${task}\n\nEarlier team material:\n${previousSummary}\n\nProvide your ${round} contribution.`,
    }), employee, round);
    return { employee, provider, content };
  });
  const failedEmployees: EmployeeId[] = [];
  for (let index = 0; index < contributions.length; index += 1) {
    const result = contributions[index]!;
    const employee = employees[index]!;
    if (result.status === "rejected") {
      failedEmployees.push(employee);
      setEmployeeStatus(employee, "ERROR");
      addActivity({ kind: "system", message: `${employee} could not complete the ${round} round. The meeting continues with available provider contributions.`, employee, camera: { fileScope: "No file disclosed", activeTool: "DeepDiscuss", taskStage: `${round} unavailable` } });
      continue;
    }
    const contribution = result.value;
    addDiscussionMessage(meetingId, { employee: contribution.employee, provider: contribution.provider, round, content: contribution.content });
    addActivity({ kind: "provider", message: `${contribution.employee} completed ${round}.`, employee: contribution.employee, camera: { fileScope: "No file disclosed", activeTool: "DeepDiscuss", taskStage: `${round} complete` } });
    setEmployeeStatus(contribution.employee, "WAITING");
  }
  if (failedEmployees.length === employees.length) throw new Error(`No provider completed the ${round} round.`);
  return { failedEmployees };
}

export async function runConcurrentRoundJobs<T>(employees: EmployeeId[], work: (employee: EmployeeId) => Promise<T>) {
  return Promise.all(employees.map((employee) => work(employee)));
}

export async function settleConcurrentRoundJobs<T>(employees: EmployeeId[], work: (employee: EmployeeId) => Promise<T>) {
  return Promise.allSettled(employees.map((employee) => work(employee)));
}

async function synthesizePlan(meetingId: string, task: string, messages: Array<{ employee: EmployeeId; content: string }>): Promise<TeamProposal> {
  const source = messages.map((message) => `${message.employee}: ${message.content}`).join("\n\n").slice(0, 16000);
  const candidates = selectLatencyPrioritySynthesisEmployees(messages);
  if (!candidates.length) throw new Error("No active employee is available to synthesize the TEAM PROPOSAL.");
  for (const synthesisEmployee of candidates) {
    try {
      setEmployeeStatus(synthesisEmployee, "THINKING");
      const provider = getEmployeeProvider(synthesisEmployee);
      const content = await withProviderRoundDeadline(getProviderAdapter(provider).generate({
        system: "You are the active AI company meeting synthesizer. Create a final owner-reviewable plan. Return strict JSON only with keys objective, techStack, filesToCreateModify, risks, confidencePercent. All arrays contain strings. confidencePercent is an integer from 0 to 100. Do not claim to have changed files or run tests.",
        user: `Owner task:\n${task}\n\nTeam discussion:\n${source}`,
      }), synthesisEmployee, "synthesis");
      const proposal = parseProposal(content, task);
      addDiscussionMessage(meetingId, { employee: synthesisEmployee, provider, round: "synthesis", content: JSON.stringify(proposal) });
      return proposal;
    } catch {
      setEmployeeStatus(synthesisEmployee, "ERROR");
      addActivity({ kind: "system", message: `${synthesisEmployee} could not synthesize the TEAM PROPOSAL. A latency-priority fallback provider is being used.`, employee: synthesisEmployee, camera: { fileScope: "No file disclosed", activeTool: "DeepDiscuss", taskStage: "Synthesis fallback" } });
    }
  }
  throw new Error("No available provider could synthesize a valid TEAM PROPOSAL.");
}

export function selectSynthesisEmployee(messages: Array<{ employee: EmployeeId }>) {
  if (isEmployeeActive("Manus")) return "Manus";
  return messages.find((message) => isEmployeeActive(message.employee))?.employee;
}

export function selectLatencyPrioritySynthesisEmployees(messages: Array<{ employee: EmployeeId }>) {
  const contributors = new Set(messages.map((message) => message.employee));
  const latencyPriority: EmployeeId[] = ["SambaNova", "Gemini", "Manus", "North Mini Code", "Mistral", "DeepSeek", "Arcee", "Grok", "Nemotron 3 Ultra", "Devstral Small 2"];
  return latencyPriority.filter((employee) => contributors.has(employee) && isEmployeeActive(employee));
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

export async function inspectVisualReference(dataUrl: string, prompt: string) {
  const vision = await getConfiguredVisionProvider();
  const response = await invokeLLM({
    model: vision.model,
    messages: [
      { role: "system", content: "You are Manus acting as a visual requirements analyst. Inspect the provided image, describe observable UI/layout details, and identify implementation considerations. Do not invent content that is not visible." },
      { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl, detail: "auto" } }] },
    ],
    maxTokens: 1800,
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("The vision-capable provider returned an empty analysis.");
  return content;
}
