import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type ActivityEvent,
  type ApprovalMode,
  type DiscussionMessage,
  type EmployeeId,
  type EmployeeProfile,
  type EmployeeStatus,
  type Meeting,
  type ProposalAction,
  type ProviderId,
  type TeamProposal,
} from "../../shared/aether";

const employeeSeed: Array<Omit<EmployeeProfile, "status" | "taskCount" | "averageScore" | "recentPerformance">> = [
  { id: "Manus", role: "Temporary CEO · Orchestrator", provider: "manus", temporaryUntil: Date.now() + 7 * 24 * 60 * 60 * 1000 },
  { id: "Gemini", role: "Lead Developer", provider: "gemini" },
  { id: "Mistral", role: "Software Engineer", provider: "mistral" },
  { id: "DeepSeek", role: "Senior Engineer", provider: "deepseek" },
  { id: "Arcee", role: "Quality Reviewer", provider: "arcee" },
  { id: "Grok", role: "Researcher", provider: "grok" },
  { id: "SambaNova", role: "Fast Analysis Worker", provider: "sambanova" },
  { id: "North Mini Code", role: "Agentic Coding Specialist", provider: "northmini" },
  { id: "Devstral Small 2", role: "Software Engineering Specialist", provider: "devstral" },
  { id: "Nemotron 3 Ultra", role: "Reasoning & Systems Specialist", provider: "nemotron" },
];

const employeeProfiles = new Map<EmployeeId, EmployeeProfile>(
  employeeSeed.map((employee) => [
    employee.id,
    { ...employee, status: "IDLE", taskCount: 0, averageScore: null, recentPerformance: [] },
  ])
);

const meetings = new Map<string, Meeting>();
const activities: ActivityEvent[] = [];
let approvalMode: ApprovalMode = "Safe Mode";

function stateFilePath() {
  return join(process.env.AETHER_CONFIG_HOME || join(homedir(), ".aether-office"), "runtime-state.json");
}

function persistState() {
  const filePath = stateFilePath();
  mkdirSync(join(filePath, ".."), { recursive: true, mode: 0o700 });
  writeFileSync(filePath, JSON.stringify({ approvalMode, employees: Array.from(employeeProfiles.values()), meetings: Array.from(meetings.values()), activities }), { mode: 0o600 });
}

function hydrateState() {
  const filePath = stateFilePath();
  if (!existsSync(filePath)) return;
  try {
    const stored = JSON.parse(readFileSync(filePath, "utf8")) as { approvalMode?: ApprovalMode; employees?: EmployeeProfile[]; meetings?: Meeting[]; activities?: ActivityEvent[] };
    if (stored.approvalMode) approvalMode = stored.approvalMode;
    stored.employees?.forEach((employee) => employeeProfiles.set(employee.id, employee));
    const manus = employeeProfiles.get("Manus");
    if (manus && manus.temporaryUntil === undefined) manus.temporaryUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    stored.meetings?.forEach((meeting) => meetings.set(meeting.id, meeting));
    if (stored.activities) activities.push(...stored.activities.slice(-200));
  } catch {
    // A corrupt non-secret local runtime state is ignored instead of blocking startup.
  }
}

export function getDashboardState(now = Date.now()) {
  return {
    approvalMode,
    employees: Array.from(employeeProfiles.values()).filter((employee) => isEmployeeActive(employee.id, now)),
    expiredTemporaryEmployees: Array.from(employeeProfiles.values()).filter((employee) => Boolean(employee.temporaryUntil && employee.temporaryUntil <= now)).map((employee) => employee.id),
    meetings: Array.from(meetings.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    activities: [...activities].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50),
  };
}

export function isEmployeeActive(employee: EmployeeId, at = Date.now()) {
  const profile = employeeProfiles.get(employee);
  return Boolean(profile && (!profile.temporaryUntil || profile.temporaryUntil > at));
}

export function setApprovalMode(mode: ApprovalMode) {
  approvalMode = mode;
  addActivity({ kind: "system", message: `Owner set approval mode to ${mode}.` });
  persistState();
  return approvalMode;
}

export function getEmployeeCurrentWork(employee: EmployeeId) {
  const profile = employeeProfiles.get(employee);
  if (!profile || !isEmployeeActive(employee)) return "Inactive — no current work.";
  const descriptions: Record<EmployeeStatus, string> = { IDLE: "Idle — no active task.", THINKING: "Currently planning the approved task.", IN_MEETING: "Currently participating in the DeepDiscuss meeting.", CODING: "Currently implementing the approved task.", REVIEWING: "Currently reviewing the approved change.", TESTING: "Currently running the approved tests.", WAITING: "Currently waiting for the next approved work step.", ERROR: "Currently blocked by a provider or workspace error.", COMPLETED: "Currently complete — no active task." };
  return descriptions[profile.status];
}

export function setEmployeeStatus(employee: EmployeeId, status: EmployeeStatus, at = Date.now()) {
  const profile = employeeProfiles.get(employee);
  if (!profile) throw new Error(`Unknown employee: ${employee}`);
  if (!isEmployeeActive(employee, at)) throw new Error(`${employee} is no longer active in this local office.`);
  profile.status = status;
  persistState();
}

export function resetEmployeeStatuses() {
  employeeProfiles.forEach((employee) => {
    employee.status = "IDLE";
  });
  persistState();
}

export function addActivity(event: Omit<ActivityEvent, "id" | "createdAt">) {
  const activity = { id: randomUUID(), createdAt: Date.now(), ...event };
  activities.push(activity);
  persistState();
  return activity;
}

export function createMeeting(task: string, selectedEmployees: EmployeeId[]) {
  const now = Date.now();
  const meeting: Meeting = {
    id: randomUUID(),
    task,
    selectedEmployees,
    messages: [],
    proposal: null,
    state: "PENDING_APPROVAL",
    createdAt: now,
    updatedAt: now,
  };
  meetings.set(meeting.id, meeting);
  addActivity({ kind: "meeting", message: "Team meeting started.", employee: "Manus" });
  persistState();
  return meeting;
}

export function getMeeting(meetingId: string) {
  return meetings.get(meetingId);
}

export function addDiscussionMessage(meetingId: string, message: Omit<DiscussionMessage, "id" | "createdAt">) {
  const meeting = requireMeeting(meetingId);
  meeting.messages.push({ id: randomUUID(), createdAt: Date.now(), ...message });
  meeting.updatedAt = Date.now();
  persistState();
  return meeting;
}

export function setProposal(meetingId: string, proposal: TeamProposal) {
  const meeting = requireMeeting(meetingId);
  meeting.proposal = proposal;
  meeting.state = "PENDING_APPROVAL";
  meeting.updatedAt = Date.now();
  addActivity({ kind: "meeting", message: "Manus produced a TEAM PROPOSAL for owner review.", employee: "Manus" });
  persistState();
  return meeting;
}

export function failMeeting(meetingId: string, errorMessage: string) {
  const meeting = requireMeeting(meetingId);
  meeting.state = "ERROR";
  meeting.errorMessage = errorMessage;
  meeting.updatedAt = Date.now();
  addActivity({ kind: "system", message: "Team meeting stopped because a provider call failed.", employee: "Manus" });
  persistState();
  return meeting;
}

export function applyProposalAction(meetingId: string, action: ProposalAction, note?: string) {
  const meeting = requireMeeting(meetingId);
  if (!meeting.proposal) throw new Error("A proposal must exist before an owner action can be recorded.");
  if (meeting.state !== "PENDING_APPROVAL") throw new Error("This proposal is no longer awaiting owner approval.");

  if (action === "Approve") meeting.state = "APPROVED";
  if (action === "Modify Plan") meeting.state = "CHANGES_REQUESTED";
  if (action === "Reject") meeting.state = "REJECTED";
  meeting.updatedAt = Date.now();

  addActivity({
    kind: "approval",
    message: `Owner selected ${action}${note ? ": " + note : "."}`,
    employee: "Manus",
  });
  persistState();
  return meeting;
}

export function assertExecutionAllowed(meetingId: string | undefined, ownerConfirmed: boolean) {
  if (approvalMode === "Autonomous Mode") return;
  if (!meetingId) throw new Error("A TEAM PROPOSAL approval is required before controlled execution.");
  const meeting = requireMeeting(meetingId);
  if (meeting.state !== "APPROVED") throw new Error("The TEAM PROPOSAL must be approved before controlled execution.");
  if (approvalMode === "Safe Mode" && !ownerConfirmed) throw new Error("Safe Mode requires explicit owner confirmation for this meaningful change.");
}

export function recordCompletedTask(employee: EmployeeId, score?: number) {
  const profile = employeeProfiles.get(employee);
  if (!profile) throw new Error(`Unknown employee: ${employee}`);
  profile.taskCount += 1;
  if (typeof score === "number") {
    profile.recentPerformance = [...profile.recentPerformance, score].slice(-8);
    profile.averageScore = profile.recentPerformance.reduce((sum, current) => sum + current, 0) / profile.recentPerformance.length;
  }
  persistState();
}

function requireMeeting(meetingId: string) {
  const meeting = meetings.get(meetingId);
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

const providerEmployeeLabels: Record<ProviderId, { label: string; role: string }> = {
  manus: { label: "Manus", role: "Temporary CEO · Orchestrator" }, gemini: { label: "Gemini", role: "Lead Developer" }, mistral: { label: "Mistral", role: "Software Engineer" }, deepseek: { label: "DeepSeek", role: "Senior Engineer" }, arcee: { label: "Arcee", role: "Quality Reviewer" }, grok: { label: "Grok", role: "Researcher" }, sambanova: { label: "SambaNova", role: "Fast Analysis Worker" }, openrouter: { label: "OpenRouter", role: "Configured Provider Worker" }, northmini: { label: "North Mini Code", role: "Agentic Coding Specialist" }, devstral: { label: "Devstral Small 2", role: "Software Engineering Specialist" }, nemotron: { label: "Nemotron 3 Ultra", role: "Reasoning & Systems Specialist" },
};

export function provisionEmployees(provider: ProviderId, count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 5) throw new Error("Provision between 1 and 5 employees at a time.");
  const descriptor = providerEmployeeLabels[provider];
  if (!descriptor) throw new Error("Unsupported provider.");
  const created: EmployeeProfile[] = [];
  for (let index = 1; created.length < count; index += 1) {
    const id = `${descriptor.label} Worker ${index}`;
    if (employeeProfiles.has(id)) continue;
    const profile: EmployeeProfile = { id, role: descriptor.role, provider, status: "IDLE", taskCount: 0, averageScore: null, recentPerformance: [] };
    employeeProfiles.set(id, profile);
    created.push(profile);
  }
  addActivity({ kind: "system", message: `Owner provisioned ${created.length} ${descriptor.label} employee${created.length === 1 ? "" : "s"}.` });
  persistState();
  return { created, totalForProvider: Array.from(employeeProfiles.values()).filter((employee) => employee.provider === provider).length };
}

export function resetStateForTests() {
  meetings.clear();
  for (const employeeId of Array.from(employeeProfiles.keys())) {
    if (!employeeSeed.some((employee) => employee.id === employeeId)) employeeProfiles.delete(employeeId);
  }
  activities.length = 0;
  approvalMode = "Safe Mode";
  employeeProfiles.forEach((employee) => {
    const seeded = employeeSeed.find((candidate) => candidate.id === employee.id);
    employee.status = "IDLE";
    employee.taskCount = 0;
    employee.averageScore = null;
    employee.recentPerformance = [];
    employee.temporaryUntil = seeded?.id === "Manus" ? Date.now() + 7 * 24 * 60 * 60 * 1000 : undefined;
  });
  persistState();
}

export function setTemporaryUntilForTests(employee: EmployeeId, temporaryUntil: number | undefined) {
  const profile = employeeProfiles.get(employee);
  if (!profile) throw new Error(`Unknown employee: ${employee}`);
  profile.temporaryUntil = temporaryUntil;
}

hydrateState();
