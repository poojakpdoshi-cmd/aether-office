import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createLaptopOverlay } from "@/lib/laptopOverlay";
import { trpc } from "@/lib/trpc";
import { LiveOffice } from "@/components/LiveOffice";
import { OfficeControlChatbox } from "@/components/OfficeControlChatbox";
import { OfficeWorldControls } from "@/components/OfficeWorldControls";
import {
  Activity,
  Bot,
  CircleDot,
  FileCode2,
  Files,
  FlaskConical,
  FolderGit2,
  GitBranch,
  MessageSquareMore,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UsersRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type WorkspaceView =
  | "Office"
  | "Cameras"
  | "Chat"
  | "Files"
  | "Editor"
  | "Diff"
  | "Tests"
  | "Git"
  | "Employees"
  | "Settings";

const QUERY_WORKSPACE_VIEWS: Record<string, WorkspaceView> = {
  cameras: "Cameras",
  chat: "Chat",
  files: "Files",
  editor: "Editor",
  diff: "Diff",
  tests: "Tests",
  git: "Git",
  employees: "Employees",
  settings: "Settings",
};

type EmployeeStatus =
  | "IDLE"
  | "THINKING"
  | "IN_MEETING"
  | "CODING"
  | "REVIEWING"
  | "TESTING"
  | "WAITING"
  | "ERROR"
  | "COMPLETED";

type Employee = {
  name: string;
  shortName: string;
  role: string;
  focus: string;
  status: EmployeeStatus;
  accent: string;
};

type ReplacementPreview = {
  search: string;
  replace: string;
  before: string;
  after: string;
  matches: number;
};

type ExecutionRequest =
  | { kind: "tests" }
  | { kind: "command"; command: string; args: string[] };

const employees: Employee[] = [
  {
    name: "Manus",
    shortName: "M",
    role: "CEO · Orchestrator",
    focus: "Plans, assigns, and synthesizes",
    status: "IDLE",
    accent: "from-violet-400 to-fuchsia-500",
  },
  {
    name: "Gemini",
    shortName: "G",
    role: "Lead Developer",
    focus: "Frontend and general engineering",
    status: "IDLE",
    accent: "from-sky-400 to-blue-600",
  },
  {
    name: "DeepSeek",
    shortName: "D",
    role: "Senior Engineer",
    focus: "Algorithms and backend architecture",
    status: "IDLE",
    accent: "from-cyan-400 to-teal-500",
  },
  {
    name: "Mistral",
    shortName: "Mi",
    role: "Software Engineer",
    focus: "Implementation and technical review",
    status: "IDLE",
    accent: "from-orange-300 to-rose-500",
  },
  {
    name: "SambaNova",
    shortName: "SN",
    role: "Rapid Analysis Worker",
    focus: "Fast implementation observations and risk scans",
    status: "IDLE",
    accent: "from-indigo-300 to-violet-500",
  },
  {
    name: "Grok",
    shortName: "Gr",
    role: "Researcher",
    focus: "Technology and alternatives research",
    status: "IDLE",
    accent: "from-amber-300 to-orange-500",
  },
  {
    name: "North Mini Code",
    shortName: "NC",
    role: "Agentic Coding Specialist",
    focus: "Repository-level coding and developer workflows",
    status: "IDLE",
    accent: "from-teal-300 to-cyan-500",
  },
  {
    name: "Devstral Small 2",
    shortName: "DS",
    role: "Software Engineering Specialist",
    focus: "Implementation sequencing and maintainable code",
    status: "IDLE",
    accent: "from-rose-300 to-pink-500",
  },
  {
    name: "Nemotron 3 Ultra",
    shortName: "N3",
    role: "Reasoning & Systems Specialist",
    focus: "Architecture, long-context reasoning, and risk analysis",
    status: "IDLE",
    accent: "from-indigo-300 to-blue-500",
  },
];

const providers = ["Manus", "Gemini", "Mistral", "DeepSeek", "Grok", "SambaNova", "OpenRouter", "North Mini Code", "Devstral Small 2", "Nemotron 3 Ultra"];

function StatusPill({ status }: { status: EmployeeStatus }) {
  return (
    <Badge className="status-pill border-white/10 bg-white/[0.06] text-[10px] font-semibold tracking-[0.11em] text-slate-200 hover:bg-white/[0.06]">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
      {status}
    </Badge>
  );
}

function EmptyWorkspace({ title, detail, action }: { title: string; detail: string; action?: string }) {
  return (
    <section className="flex min-h-[410px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.018] px-8 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-300">
        <CircleDot className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{detail}</p>
      {action ? <p className="mt-5 text-xs font-medium text-sky-300">{action}</p> : null}
    </section>
  );
}

function VerifiedActivityTimeline({ activities }: { activities: Array<{ id: string; kind: string; message: string; createdAt: number; employee?: string }> }) {
  return (
    <section className="mt-5 rounded-xl border border-white/[0.08] bg-black/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">Verified activity timeline</p>
          <p className="mt-1 text-xs text-slate-500">Real meeting, approval, tool, and workspace events only.</p>
        </div>
        <Activity className="h-4 w-4 text-sky-300" />
      </div>
      {activities.length ? (
        <div className="mt-4 space-y-2">
          {activities.slice(0, 8).map((event) => (
            <div key={event.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.6)]" />
              <div className="min-w-0"><p className="text-xs leading-5 text-slate-300">{event.message}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-slate-600">{event.employee ?? "System"} · {event.kind}</p></div>
              <time className="text-[10px] text-slate-600">{new Date(event.createdAt).toLocaleTimeString()}</time>
            </div>
          ))}
        </div>
      ) : <p className="mt-4 rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-xs text-slate-500">No verified events have been recorded for this location yet.</p>}
    </section>
  );
}

function MeetingCollaborationPulse({ meeting }: { meeting: { selectedEmployees: string[]; messages: Array<{ employee: string; round: string }>; state: string } }) {
  const contributions = meeting.selectedEmployees.map((employee) => ({
    employee,
    rounds: Array.from(new Set(meeting.messages.filter((message) => message.employee === employee).map((message) => message.round))),
  }));

  return (
    <section className="mt-5 rounded-xl border border-sky-300/15 bg-sky-300/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">Meeting collaboration pulse</p><p className="mt-1 text-xs text-slate-500">Derived from recorded DeepDiscuss participants and rounds.</p></div>
        <Badge className="border-white/10 bg-white/[0.06] text-[10px] text-slate-200 hover:bg-white/[0.06]">{meeting.state.replaceAll("_", " ")}</Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {contributions.map((contribution) => <div key={contribution.employee} className="rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2.5"><p className="text-xs font-semibold text-slate-200">{contribution.employee}</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-sky-200">{contribution.rounds.length ? contribution.rounds.join(" · ") : "invited · awaiting recorded round"}</p></div>)}
      </div>
    </section>
  );
}

type EmployeeInspection = {
  employee: string;
  state: "IDLE" | "RUNNING_COMMAND" | "TESTING";
  safeTaskSummary: string;
  currentWork: string;
  startedAt: string | null;
  activeExecutions: Array<{ id: string; command: string; args: string[]; status: string; stdout: string; stderr: string; startedAt: string }>;
  recentExecutions: Array<{ id: string; command: string; args: string[]; status: string; stdout: string; stderr: string; startedAt: string }>;
  recentFiles: Array<{ path: string; tool: string; when: string; result: string }>;
  activity: Array<{ tool: string; path: string; when: string; result: string }>;
};

function EmployeeInspectionPanel({ employee, providerLabel, providerModel, snapshot, gitDiff }: { employee: Employee; providerLabel: string; providerModel?: string; snapshot?: EmployeeInspection; gitDiff?: string }) {
  const executions = snapshot ? [...snapshot.activeExecutions, ...snapshot.recentExecutions].slice(0, 3) : [];
  const elapsed = snapshot?.startedAt ? Math.max(0, Math.floor((Date.now() - new Date(snapshot.startedAt).getTime()) / 1000)) : null;
  const elapsedLabel = elapsed === null ? "—" : `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  return (
    <section className="mt-5 rounded-xl border border-sky-300/15 bg-slate-950/55 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">Live employee workspace</p><h3 className="mt-1 text-sm font-semibold text-white">{employee.name} · {employee.role}</h3><p className="mt-1 text-xs text-slate-400">Provider: {providerLabel}{providerModel ? ` · Model: ${providerModel}` : ""} · Current state: {snapshot?.state ?? employee.status} · Time: {elapsedLabel}</p></div><Badge className="border-white/10 bg-white/[0.06] text-[10px] text-slate-200 hover:bg-white/[0.06]">REAL EVENTS ONLY</Badge></div>
      <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Current work now</p><p className="mt-1 text-sm font-semibold leading-6 text-emerald-50">{snapshot?.currentWork ?? "Checking current runtime state…"}</p></div><p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs leading-5 text-slate-300">{snapshot?.safeTaskSummary ?? "Current state is being checked…"}</p>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Terminal</p>{executions.length ? <div className="mt-2 space-y-2">{executions.map((execution) => <div key={execution.id} className="rounded bg-black/40 p-2 font-mono text-[11px] leading-5 text-slate-300"><p className="text-emerald-200">$ {execution.command} {execution.args.join(" ")}</p><pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-slate-400">{(execution.stdout || execution.stderr || "Process is running; output will appear here when the process writes it.").slice(0, 600)}</pre></div>)}</div> : <p className="mt-3 text-xs text-slate-500">No recorded controlled terminal process for this employee.</p>}</div>
        <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Files accessed or changed</p>{snapshot?.recentFiles.length ? <div className="mt-2 space-y-1.5">{snapshot.recentFiles.slice(0, 8).map((file) => <div key={`${file.path}-${file.when}`} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-300">{file.path}</span><span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-sky-200">{file.tool}</span></div>)}</div> : <p className="mt-3 text-xs text-slate-500">No controlled file activity recorded for this employee.</p>}</div>
        <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Activity</p>{snapshot?.activity.length ? <div className="mt-2 space-y-1.5">{snapshot.activity.slice(0, 8).map((event) => <p key={`${event.tool}-${event.path}-${event.when}`} className="text-xs text-slate-400"><span className="mr-2 text-slate-600">{new Date(event.when).toLocaleTimeString()}</span>{event.tool} · {event.path}</p>)}</div> : <p className="mt-3 text-xs text-slate-500">No verified activity has been recorded yet.</p>}</div>
        <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Changes</p><pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-400">{gitDiff?.trim() ? gitDiff.slice(0, 2_500) : "No current Git diff is available for the selected workspace."}</pre></div>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-slate-600">Safe status summaries only. Provider keys, private prompts, unrestricted shell sessions, and hidden reasoning are never displayed.</p>
    </section>
  );
}

type EmployeeRoomSnapshot = {
  room: { id: string; workspaceLabel: string };
  sandbox: { id: string; status: "stopped" | "building" | "running" | "runtime-unavailable" | "error"; containerName: string; volumeName: string; workspacePath: string; detail?: string };
  processes: Array<{ id: string; command: string; args: string[]; status: "running" | "completed" | "failed" | "cancelled"; startedAt: number; completedAt: number | null; exitCode: number | null; stdout: string; stderr: string }>;
};

function EmployeeSandboxRoom({ employee }: { employee: string }) {
  const [command, setCommand] = useState("");
  const [argumentsText, setArgumentsText] = useState("");
  const [destroyConfirmed, setDestroyConfirmed] = useState(false);
  const roomQuery = trpc.aether.employeeRoom.useQuery({ employee }, { refetchInterval: 1_000 });
  const startMutation = trpc.aether.startEmployeeSandbox.useMutation({ onSuccess: () => roomQuery.refetch() });
  const stopMutation = trpc.aether.stopEmployeeSandbox.useMutation({ onSuccess: () => roomQuery.refetch() });
  const restartMutation = trpc.aether.restartEmployeeSandbox.useMutation({ onSuccess: () => roomQuery.refetch() });
  const destroyMutation = trpc.aether.destroyEmployeeSandbox.useMutation({ onSuccess: () => { setDestroyConfirmed(false); roomQuery.refetch(); } });
  const runMutation = trpc.aether.runEmployeeSandboxCommand.useMutation({ onSuccess: () => { setCommand(""); setArgumentsText(""); roomQuery.refetch(); } });
  const room = roomQuery.data as EmployeeRoomSnapshot | undefined;
  const sandbox = room?.sandbox;
  const busy = startMutation.isPending || stopMutation.isPending || restartMutation.isPending || destroyMutation.isPending || runMutation.isPending;
  const latestProcess = room?.processes[0];

  return <section className="mt-5 rounded-xl border border-violet-300/20 bg-violet-300/[0.035] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200">Employee room · isolated local sandbox</p><h3 className="mt-1 text-sm font-semibold text-white">{employee}&apos;s Computer</h3><p className="mt-1 text-xs leading-5 text-slate-400">A real Docker Desktop or Podman container with a separate persistent workspace. AetherOffice never sends this terminal to the host shell.</p></div><Badge className={sandbox?.status === "running" ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100 hover:bg-emerald-300/[0.08]" : "border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.06]"}>{sandbox?.status ?? "checking"}</Badge></div>
    {sandbox ? <div className="mt-3 grid gap-2 rounded-lg border border-white/[0.07] bg-black/20 p-3 text-[11px] text-slate-400 sm:grid-cols-3"><p><span className="block text-[10px] uppercase tracking-[0.1em] text-slate-600">Workspace</span>{sandbox.workspacePath}</p><p><span className="block text-[10px] uppercase tracking-[0.1em] text-slate-600">Container</span>{sandbox.containerName}</p><p><span className="block text-[10px] uppercase tracking-[0.1em] text-slate-600">Network</span>Disabled by default</p></div> : null}
    {sandbox?.detail ? <p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-xs leading-5 text-amber-100">{sandbox.detail}</p> : null}
    <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => startMutation.mutate({ employee })} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">Start sandbox</Button><Button size="sm" variant="outline" disabled={busy || sandbox?.status !== "running"} onClick={() => stopMutation.mutate({ employee, ownerConfirmed: true })} className="border-white/10 bg-white/[0.03] text-slate-200">Stop</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => restartMutation.mutate({ employee, ownerConfirmed: true })} className="border-white/10 bg-white/[0.03] text-slate-200">Restart</Button><label className="ml-auto flex items-center gap-2 text-[10px] text-rose-200"><input type="checkbox" checked={destroyConfirmed} onChange={(event) => setDestroyConfirmed(event.target.checked)} />Delete workspace</label><Button size="sm" variant="outline" disabled={busy || !destroyConfirmed} onClick={() => destroyMutation.mutate({ employee, ownerConfirmed: true })} className="border-rose-300/25 bg-rose-300/[0.04] text-rose-200">Destroy</Button></div>
    <form className="mt-4 rounded-lg border border-white/[0.07] bg-black/20 p-3" onSubmit={(event) => { event.preventDefault(); const executable = command.trim(); if (!executable) return; runMutation.mutate({ employee, command: executable, args: argumentsText.trim() ? argumentsText.trim().split(/\s+/) : [], ownerConfirmed: true }); }}><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200">Real sandbox terminal</p><div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><Input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Executable, e.g. node" disabled={busy || sandbox?.status !== "running"} className="border-white/10 bg-slate-950 text-slate-100" /><Input value={argumentsText} onChange={(event) => setArgumentsText(event.target.value)} placeholder="Arguments, space-separated" disabled={busy || sandbox?.status !== "running"} className="border-white/10 bg-slate-950 text-slate-100" /><Button type="submit" size="sm" disabled={busy || sandbox?.status !== "running"} className="bg-violet-300 text-slate-950 hover:bg-violet-200">Run in {employee}&apos;s sandbox</Button></div><p className="mt-2 text-[10px] leading-4 text-slate-600">Commands run via `container exec` as the non-root sandbox user. They are not parsed by a host shell; output is bounded and recorded as real local evidence.</p></form>
    {latestProcess ? <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/30 p-3"><div className="flex items-center justify-between gap-3"><p className="font-mono text-[11px] text-emerald-200">$ {latestProcess.command} {latestProcess.args.join(" ")}</p><span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{latestProcess.status}</span></div><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-400">{latestProcess.stdout || latestProcess.stderr || "Process is running; output will appear when the isolated command writes it."}</pre></div> : <p className="mt-4 text-xs text-slate-500">No real sandbox terminal process has run for this employee yet.</p>}
    {roomQuery.error || startMutation.error || stopMutation.error || restartMutation.error || destroyMutation.error || runMutation.error ? <p className="mt-3 text-xs leading-5 text-rose-300">{roomQuery.error?.message ?? startMutation.error?.message ?? stopMutation.error?.message ?? restartMutation.error?.message ?? destroyMutation.error?.message ?? runMutation.error?.message}</p> : null}
  </section>;
}

type ProjectPreview = {
  selected: boolean;
  url: string | null;
  source: "configured" | "controlled-dev-server" | "unavailable";
  lastCommand: { command: string; args: string[]; status: string; startedAt: string; completedAt: string | null; stdout: string; stderr: string } | null;
  lastTest: { command: string; args: string[]; status: string; startedAt: string; completedAt: string | null; stdout: string; stderr: string } | null;
};

type BrowserEvidence = {
  id: string;
  scenario: BrowserScenario;
  createdAt: string;
  targetUrl: string;
  finalUrl: string | null;
  title: string | null;
  httpStatus: number | null;
  passed: boolean;
  console: Array<{ level: string; text: string }>;
  network: Array<{ method: string; status: number; url: string }>;
  errors: string[];
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  localScreenshotPath: string | null;
};

type BrowserScenario = "page-load" | "responsive-capture" | "safe-form-inspection";

const browserTestBridge: { canRun: boolean; testing: boolean; run: (scenario: BrowserScenario) => void } = { canRun: false, testing: false, run: () => undefined };

function ProjectPreviewPanel({ preview, draftUrl, onDraftUrlChange, onConfigure, saving, browserEvidence: inputBrowserEvidence, browserTesting = browserTestBridge.testing, canRunBrowserTest = browserTestBridge.canRun, onRunBrowserTest = browserTestBridge.run }: { preview?: ProjectPreview; draftUrl: string; onDraftUrlChange: (value: string) => void; onConfigure: () => void; saving: boolean; browserEvidence?: BrowserEvidence | null; browserTesting?: boolean; canRunBrowserTest?: boolean; onRunBrowserTest?: (scenario: BrowserScenario) => void }) {
  const evidence = preview?.lastTest ?? preview?.lastCommand;
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [browserScenario, setBrowserScenario] = useState<BrowserScenario>("page-load");
  const browserEvidenceQuery = trpc.aether.latestBrowserEvidence.useQuery(undefined, { refetchInterval: 1500 });
  const browserEvidence = inputBrowserEvidence ?? browserEvidenceQuery.data;
  return <section className="mt-5 rounded-xl border border-sky-300/15 bg-slate-950/55 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">Local project browser</p><h3 className="mt-1 text-sm font-semibold text-white">Guarded loopback preview</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">AetherOffice accepts only explicit local HTTP URLs on localhost, 127.0.0.1, or [::1]. No remote site can be embedded or opened from this panel.</p></div><Badge className="border-white/10 bg-white/[0.06] text-[10px] text-slate-200 hover:bg-white/[0.06]">{preview?.source ?? "unavailable"}</Badge></div>
    <div className="mt-4 flex flex-wrap gap-2"><Input value={draftUrl} onChange={(event) => onDraftUrlChange(event.target.value)} placeholder="http://localhost:5173" className="max-w-md border-white/10 bg-black/20 font-mono text-slate-100" /><Button size="sm" disabled={!draftUrl.trim() || saving} onClick={onConfigure} className="bg-sky-300 text-slate-950 hover:bg-sky-200">{saving ? "Checking…" : "Open local preview"}</Button></div>
    {preview?.url ? <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.08] bg-black"><div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3 py-2"><span className="truncate font-mono text-[10px] text-slate-400">{preview.url}</span><div className="flex shrink-0 items-center gap-3"><Button size="sm" variant="outline" onClick={() => setPreviewReloadKey((key) => key + 1)} className="h-6 border-white/10 bg-white/[0.03] px-2 text-[10px] text-sky-200">Reload preview</Button><a href={preview.url} target="_blank" rel="noreferrer" className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200 hover:text-sky-100">Open separately</a></div></div><iframe key={previewReloadKey} title="Selected local project preview" src={preview.url} sandbox="allow-forms allow-scripts allow-same-origin" className="h-[360px] w-full bg-white" /></div> : <p className="mt-4 rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-xs leading-5 text-slate-500">No verified local preview is configured. Start your project locally, then provide its loopback URL here. Controlled development-server output can also supply a detected local URL.</p>}
    {evidence ? <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Latest controlled evidence</p><p className="mt-1 font-mono text-[11px] text-emerald-200">$ {evidence.command} {evidence.args.join(" ")} · {evidence.status}</p><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-400">{(evidence.stdout || evidence.stderr || "No captured output.").slice(0, 2_500)}</pre></div> : null}
    <div className="mt-4 rounded-lg border border-violet-300/15 bg-violet-300/[0.04] p-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200">Controlled browser test</p><p className="mt-1 text-xs text-slate-400">Runs local Chromium against the configured loopback preview and captures only real browser evidence.</p><label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Approved scenario<select aria-label="Approved browser scenario" value={browserScenario} onChange={(event) => setBrowserScenario(event.target.value as BrowserScenario)} className="mt-1 block w-full rounded border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"><option value="page-load">Page load + console/network evidence</option><option value="responsive-capture">Responsive mobile capture</option><option value="safe-form-inspection">Safe form inspection — no typing or submit</option></select></label></div><Button size="sm" disabled={!canRunBrowserTest || browserTesting} onClick={() => onRunBrowserTest(browserScenario)} className="bg-violet-300 text-slate-950 hover:bg-violet-200">{browserTesting ? "Testing…" : "Run browser test"}</Button></div>{!canRunBrowserTest ? <p className="mt-2 text-[10px] leading-4 text-amber-200">Approve a TEAM PROPOSAL, confirm the action, and configure a loopback preview before testing.</p> : null}
      {browserEvidence ? <div className="mt-3 grid gap-3 lg:grid-cols-2"><div className="rounded border border-white/[0.07] bg-black/20 p-2.5 text-xs text-slate-400"><p className={browserEvidence.passed ? "font-semibold text-emerald-200" : "font-semibold text-rose-200"}>{browserEvidence.passed ? "PASSED" : "FAILED"} · {browserEvidence.scenario} · HTTP {browserEvidence.httpStatus ?? "—"}</p><p className="mt-1 truncate font-mono text-[10px]">{browserEvidence.finalUrl ?? browserEvidence.targetUrl}</p><p className="mt-1 text-[10px] text-slate-600">{browserEvidence.title ?? "No document title"}</p>{browserEvidence.localScreenshotPath ? <p className="mt-2 font-mono text-[10px] text-violet-200">Screenshot saved locally: {browserEvidence.localScreenshotPath}</p> : null}</div><div className="rounded border border-white/[0.07] bg-black/20 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">Checks, console, and errors</p><pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-400">{[...browserEvidence.checks.map((check) => `[${check.passed ? "pass" : "fail"}] ${check.name}: ${check.detail}`), ...browserEvidence.console.map((entry) => `[${entry.level}] ${entry.text}`), ...browserEvidence.errors.map((error) => `[error] ${error}`)].join("\n") || "No console messages or page errors were captured."}</pre></div><div className="rounded border border-white/[0.07] bg-black/20 p-2.5 lg:col-span-2"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">Network evidence</p><pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-slate-400">{browserEvidence.network.map((entry) => `${entry.status} ${entry.method} ${entry.url}`).join("\n") || "No qualifying network responses were captured."}</pre></div></div> : <p className="mt-3 text-xs text-slate-500">No controlled browser test has been recorded for this workspace yet.</p>}</div>
    <p className="mt-3 text-[10px] leading-4 text-slate-600">Preview URLs and captured command output are locally scoped. Sensitive values in execution output are redacted before display.</p>
  </section>;
}

type ProofReport = { id: string; createdAt: string; workspaceName: string; localReportDirectory: string; markdown: string; evidence: { screenshots: string[] } };

function ProofReportPanel({ report, generating, onGenerate }: { report?: ProofReport | null; generating: boolean; onGenerate: () => void }) {
  return <section className="mt-5 rounded-xl border border-violet-300/15 bg-slate-950/55 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200">Proof report</p><h3 className="mt-1 text-sm font-semibold text-white">Local evidence package</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Generate a local Markdown and JSON report from recorded controlled tests, the current local Git status and diff, and verified audit events. This does not invent screenshots or browser-test results.</p></div><Button size="sm" disabled={generating} onClick={onGenerate} className="bg-violet-300 text-slate-950 hover:bg-violet-200">{generating ? "Assembling…" : "Generate proof report"}</Button></div>{report ? <div className="mt-4"><div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-xs leading-5 text-slate-400"><p className="text-slate-200">Generated {new Date(report.createdAt).toLocaleString()} for {report.workspaceName}</p><p className="mt-1 font-mono text-[10px] text-slate-600">Saved locally in: {report.localReportDirectory}</p><p className="mt-1 text-[10px] text-slate-600">Recorded screenshots: {report.evidence.screenshots.length}</p></div><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-white/[0.08] bg-black/30 p-3 font-mono text-[10px] leading-5 text-slate-400">{report.markdown}</pre></div> : <p className="mt-4 rounded-lg border border-dashed border-white/[0.08] px-3 py-4 text-xs text-slate-500">No proof report has been generated in this local runtime yet.</p>}</section>;
}

function EvidenceGalleryPanel() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<string | null>(null);
  const galleryQuery = trpc.aether.evidenceGallery.useQuery(undefined, { refetchInterval: 2_000 });
  const reportQuery = trpc.aether.readEvidenceReport.useQuery({ id: selectedReportId ?? "proof-empty" }, { enabled: Boolean(selectedReportId) });
  const screenshotQuery = trpc.aether.readEvidenceScreenshot.useQuery({ id: selectedScreenshotId ?? "browser-empty" }, { enabled: Boolean(selectedScreenshotId) });
  const gallery = galleryQuery.data;
  return <section className="mt-5 rounded-xl border border-amber-300/15 bg-slate-950/55 p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">Evidence gallery</p><h3 className="mt-1 text-sm font-semibold text-white">Persisted local screenshots and reports</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Only generated browser screenshots and proof reports from the selected workspace’s local evidence root are listed. Arbitrary local paths cannot be opened here.</p></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-lg border border-white/[0.08] bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200">Proof reports</p>{gallery?.reports.length ? <div className="mt-2 space-y-2">{gallery.reports.map((report) => <button key={report.id} type="button" onClick={() => { setSelectedReportId(report.id); setSelectedScreenshotId(null); }} className={selectedReportId === report.id ? "w-full rounded border border-amber-200/30 bg-amber-200/[0.08] px-3 py-2 text-left" : "w-full rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left hover:bg-white/[0.05]"}><p className="truncate font-mono text-[10px] text-slate-200">{report.id}</p><p className="mt-1 text-[10px] text-slate-500">{new Date(report.createdAt).toLocaleString()} · {Math.ceil(report.bytes / 1024)} KB</p></button>)}</div> : <p className="mt-3 text-xs text-slate-500">No persisted proof reports in this workspace yet.</p>}</div><div className="rounded-lg border border-white/[0.08] bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200">Browser screenshots</p>{gallery?.screenshots.length ? <div className="mt-2 space-y-2">{gallery.screenshots.map((screenshot) => <button key={screenshot.id} type="button" onClick={() => { setSelectedScreenshotId(screenshot.id); setSelectedReportId(null); }} className={selectedScreenshotId === screenshot.id ? "w-full rounded border border-amber-200/30 bg-amber-200/[0.08] px-3 py-2 text-left" : "w-full rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left hover:bg-white/[0.05]"}><p className="truncate font-mono text-[10px] text-slate-200">{screenshot.id}</p><p className="mt-1 text-[10px] text-slate-500">{new Date(screenshot.createdAt).toLocaleString()} · {Math.ceil(screenshot.bytes / 1024)} KB</p></button>)}</div> : <p className="mt-3 text-xs text-slate-500">No persisted browser screenshots in this workspace yet.</p>}</div></div>{reportQuery.data ? <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-white/[0.08] bg-black/30 p-3 font-mono text-[10px] leading-5 text-slate-400">{reportQuery.data.markdown}</pre> : null}{screenshotQuery.data ? <img src={screenshotQuery.data.dataUrl} alt="Captured local browser evidence" className="mt-4 max-h-[520px] w-full rounded-lg border border-white/[0.08] bg-white object-contain" /> : null}{reportQuery.error || screenshotQuery.error ? <p className="mt-3 text-xs text-rose-300">The selected local evidence item could not be opened.</p> : null}</section>;
}

export default function Home() {
  const [activeView, setActiveView] = useState<WorkspaceView>(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view")?.toLowerCase();
    return requestedView ? QUERY_WORKSPACE_VIEWS[requestedView] ?? "Office" : "Office";
  });
  const [task, setTask] = useState("");
  const [submittedTask, setSubmittedTask] = useState<string | null>(null);
  const [mode, setMode] = useState("Safe Mode");
  const [setupProvider, setSetupProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [compatibilityAcknowledged, setCompatibilityAcknowledged] = useState(false);
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [fileSearch, setFileSearch] = useState("");
  const [uploadedAttachment, setUploadedAttachment] = useState<string | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [draftHistory, setDraftHistory] = useState<string[]>([]);
  const [draftHistoryIndex, setDraftHistoryIndex] = useState(-1);
  const [editorSearch, setEditorSearch] = useState("");
  const [editorReplacement, setEditorReplacement] = useState("");
  const [replaceAllMatches, setReplaceAllMatches] = useState(true);
  const [replacementPreview, setReplacementPreview] = useState<ReplacementPreview | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [commandName, setCommandName] = useState("pnpm");
  const [commandArgs, setCommandArgs] = useState("test");
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [executionAttempts, setExecutionAttempts] = useState(0);
  const [lastExecutionRequest, setLastExecutionRequest] = useState<ExecutionRequest | null>(null);
  const [focusedCamera, setFocusedCamera] = useState("Office Floor");
  const [officeFocus, setOfficeFocus] = useState<string | null>(null);
  const [exitPanelOpen, setExitPanelOpen] = useState(false);
  const [provisionProvider, setProvisionProvider] = useState("gemini");
  const [provisionCount, setProvisionCount] = useState(1);
  const [provisionConfirmed, setProvisionConfirmed] = useState(false);
  const [managerCommand, setManagerCommand] = useState("");
  const [managerMessages, setManagerMessages] = useState<Array<{ role: "manager" | "owner"; content: string }>>([]);
  const [managerTaskCandidate, setManagerTaskCandidate] = useState<string | null>(null);
  const [showWorldControls, setShowWorldControls] = useState(false);
  const [projectPreviewUrl, setProjectPreviewUrl] = useState("");
  const startedManagerTaskRef = useRef<string | null>(null);
  const providerQuery = trpc.aether.providers.useQuery();
  const dashboardQuery = trpc.aether.dashboard.useQuery(undefined, { refetchInterval: 1500 });
  const workspaceQuery = trpc.aether.workspace.useQuery(undefined, { refetchInterval: 3000 });
  const projectPreviewQuery = trpc.aether.projectPreview.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.selected), refetchInterval: 1500 });
  const latestBrowserEvidenceQuery = trpc.aether.latestBrowserEvidence.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.selected) });
  const latestProofReportQuery = trpc.aether.latestProofReport.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.selected) });
  const approvalModeMutation = trpc.aether.setApprovalMode.useMutation();
  const provisionEmployeesMutation = trpc.aether.provisionEmployees.useMutation({ onSuccess: () => { setProvisionConfirmed(false); dashboardQuery.refetch(); } });
  const configureProviderMutation = trpc.aether.configureProvider.useMutation({
    onSuccess: () => {
      setApiKey("");
      setModel("");
      setBaseUrl("");
      setCompatibilityAcknowledged(false);
      setSetupProvider(null);
      providerQuery.refetch();
    },
  });
  const providerStatuses = providerQuery.data ?? [];
  const configuredCount = providerStatuses.filter((provider) => provider.configured).length;
  const dashboard = dashboardQuery.data;
  const latestMeeting = dashboard?.meetings[0];
  const configuredEmployeeNames = new Set(providerStatuses.filter((provider) => provider.configured).map((provider) => provider.id === "sambanova" ? "SambaNova" : provider.label));
  const activeEmployeeNames = new Set<string>(dashboard?.employees.map((profile) => profile.id) ?? []);
  const liveEmployees = employees.filter((employee) => activeEmployeeNames.has(employee.name) && configuredEmployeeNames.has(employee.name)).map((employee) => ({
    ...employee,
    status: (dashboard?.employees.find((profile) => profile.id === employee.name)?.status ?? employee.status) as EmployeeStatus,
  }));
  const inspectedEmployeeName = useMemo(() => {
    const employeeTarget = officeFocus?.replace(/ (Desk|Laptop|Computer|Room)$/, "");
    const target = officeFocus === "Manager" ? "Manus" : employeeTarget;
    return liveEmployees.find((employee) => employee.name === target)?.name;
  }, [liveEmployees, officeFocus]);
  const startDeepDiscussMutation = trpc.aether.startDeepDiscuss.useMutation({ onSuccess: () => dashboardQuery.refetch() });
  const managerChatMutation = trpc.aether.managerChat.useMutation({
    onSuccess: (result) => {
      setManagerMessages((messages) => [...messages, { role: "manager", content: result.reply }]);
      if (result.kind === "task-proposed" && result.taskCandidate) setManagerTaskCandidate(result.taskCandidate);
    },
  });
  const proposalActionMutation = trpc.aether.proposalAction.useMutation({ onSuccess: () => dashboardQuery.refetch() });
  const selectWorkspaceMutation = trpc.aether.selectWorkspace.useMutation({ onSuccess: () => { workspaceQuery.refetch(); directoryQuery.refetch(); workspaceTreeQuery.refetch(); } });
  const directoryQuery = trpc.aether.listDirectory.useQuery({ path: "." }, { enabled: Boolean(workspaceQuery.data?.selected) });
  const workspaceTreeQuery = trpc.aether.workspaceTree.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.selected) });
  const normalizedFileSearch = fileSearch.trim();
  const fileSearchQuery = trpc.aether.searchFiles.useQuery({ query: normalizedFileSearch }, { enabled: Boolean(workspaceQuery.data?.selected && normalizedFileSearch.length >= 2) });
  const fileQuery = trpc.aether.readFile.useQuery({ path: selectedFile ?? "." }, { enabled: Boolean(selectedFile) });
  const gitStatusQuery = trpc.aether.gitStatus.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.gitAvailable) });
  const gitDiffQuery = trpc.aether.gitDiff.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.gitAvailable) });
  const employeeInspectionQuery = trpc.aether.employeeInspection.useQuery({ employee: (inspectedEmployeeName ?? "Manus") as "Manus" }, { enabled: Boolean(inspectedEmployeeName && workspaceQuery.data?.selected), refetchInterval: 1000 });
  const configureProjectPreviewMutation = trpc.aether.configureProjectPreview.useMutation({ onSuccess: (preview) => { setProjectPreviewUrl(preview.url ?? ""); projectPreviewQuery.refetch(); } });
  const runProjectBrowserTestMutation = trpc.aether.runProjectBrowserTest.useMutation({ onSuccess: () => { latestBrowserEvidenceQuery.refetch(); latestProofReportQuery.refetch(); } });
  const generateProofReportMutation = trpc.aether.generateProofReport.useMutation({ onSuccess: () => latestProofReportQuery.refetch() });
  const uploadMutation = trpc.aether.importUpload.useMutation({ onSuccess: (result) => { setUploadedAttachment(result.relativePath); directoryQuery.refetch(); workspaceTreeQuery.refetch(); } });
  const inspectImageMutation = trpc.aether.inspectImage.useMutation({ onSuccess: (result) => setVisionAnalysis(result.analysis) });
  const writeFileMutation = trpc.aether.writeFile.useMutation({ onSuccess: () => { setLastSavedContent(draftContent); fileQuery.refetch(); gitDiffQuery.refetch(); } });
  const runTestsMutation = trpc.aether.runTests.useMutation();
  const executionStatusQuery = trpc.aether.executionStatus.useQuery({ id: activeExecutionId ?? "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(activeExecutionId), refetchInterval: 500 });
  const startCommandMutation = trpc.aether.startCommand.useMutation({ onSuccess: (execution) => { setActiveExecutionId(execution.id); setExecutionAttempts((count) => count + 1); } });
  const startTestsMutation = trpc.aether.startTests.useMutation({ onSuccess: (execution) => { setActiveExecutionId(execution.id); setExecutionAttempts((count) => count + 1); } });
  const cancelExecutionMutation = trpc.aether.cancelExecution.useMutation({ onSuccess: () => executionStatusQuery.refetch() });
  const createCommitMutation = trpc.aether.createCommit.useMutation({ onSuccess: () => { gitStatusQuery.refetch(); gitDiffQuery.refetch(); setCommitMessage(""); } });
  const revertCommitMutation = trpc.aether.revertCommit.useMutation({ onSuccess: () => { gitStatusQuery.refetch(); gitDiffQuery.refetch(); gitHistoryQuery.refetch(); } });
  const gitHistoryQuery = trpc.aether.gitHistory.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.gitAvailable) });
  const workspaceLabel = useMemo(() => workspaceQuery.data?.selected ? workspaceQuery.data.root?.split("/").pop() ?? "Selected workspace" : submittedTask ? "Task staged" : "No workspace selected", [submittedTask, workspaceQuery.data]);

  useEffect(() => {
    if (!showWorldControls) return;
    window.setTimeout(() => document.getElementById("office-world-controls")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, [showWorldControls]);

  useEffect(() => {
    if (fileQuery.data?.content === undefined) return;
    setDraftContent(fileQuery.data.content);
    setLastSavedContent(fileQuery.data.content);
    setDraftHistory([fileQuery.data.content]);
    setDraftHistoryIndex(0);
    setReplacementPreview(null);
  }, [fileQuery.data?.content, selectedFile]);

  const recordDraft = (nextContent: string) => {
    setDraftContent(nextContent);
    setDraftHistory((history) => {
      const base = history.slice(0, draftHistoryIndex + 1);
      if (base.at(-1) === nextContent) return history;
      const nextHistory = [...base, nextContent].slice(-80);
      setDraftHistoryIndex(nextHistory.length - 1);
      return nextHistory;
    });
  };

  const undoDraft = () => {
    if (draftHistoryIndex <= 0) return;
    const nextIndex = draftHistoryIndex - 1;
    setDraftHistoryIndex(nextIndex);
    setDraftContent(draftHistory[nextIndex] ?? draftContent);
  };

  const redoDraft = () => {
    if (draftHistoryIndex < 0 || draftHistoryIndex >= draftHistory.length - 1) return;
    const nextIndex = draftHistoryIndex + 1;
    setDraftHistoryIndex(nextIndex);
    setDraftContent(draftHistory[nextIndex] ?? draftContent);
  };

  const prepareReplacement = () => {
    if (!editorSearch) return;
    const matches = draftContent.split(editorSearch).length - 1;
    if (!matches) return;
    const after = replaceAllMatches ? draftContent.split(editorSearch).join(editorReplacement) : draftContent.replace(editorSearch, editorReplacement);
    setReplacementPreview({ search: editorSearch, replace: editorReplacement, before: draftContent, after, matches: replaceAllMatches ? matches : 1 });
  };

  const openWorkspaceFile = (path: string) => {
    setOpenFiles((files) => files.includes(path) ? files : [...files, path]);
    setSelectedFile(path);
    setActiveView("Editor");
  };

  const closeWorkspaceFile = (path: string) => {
    setOpenFiles((files) => {
      const nextFiles = files.filter((file) => file !== path);
      if (selectedFile === path) setSelectedFile(nextFiles.at(-1) ?? null);
      return nextFiles;
    });
  };

  const beginExecution = (request: ExecutionRequest, retry = false) => {
    if (!latestMeeting || latestMeeting.state !== "APPROVED" || !ownerConfirmed) return;
    if (retry && executionAttempts >= 3) return;
    if (!retry) setExecutionAttempts(0);
    setLastExecutionRequest(request);
    if (request.kind === "tests") {
      startTestsMutation.mutate({ who: "Owner", why: retry ? "Owner retried the approved workspace test run." : "Owner initiated the approved workspace test run.", meetingId: latestMeeting.id, ownerConfirmed });
      return;
    }
    startCommandMutation.mutate({ command: request.command, args: request.args, who: "Owner", why: retry ? "Owner retried an approved bounded workspace command." : "Owner initiated an approved bounded workspace command.", meetingId: latestMeeting.id, ownerConfirmed });
  };

  const handleTaskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = task.trim();
    if (!trimmed) return;
    setSubmittedTask(trimmed);
    setTask("");
    setActiveView("Chat");
  };

  const saveProvider = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!setupProvider || setupProvider === "Manus") return;
    configureProviderMutation.mutate({
      provider: ({ "North Mini Code": "northmini", "Devstral Small 2": "devstral", "Nemotron 3 Ultra": "nemotron" }[setupProvider] ?? setupProvider.toLowerCase()) as "gemini" | "mistral" | "deepseek" | "grok" | "sambanova" | "openrouter" | "northmini" | "devstral" | "nemotron",
      apiKey,
      ...(model.trim() ? { model: model.trim() } : {}),
      ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
      ...(setupProvider === "Devstral Small 2" ? { compatibilityAcknowledged } : {}),
    });
  };

  useEffect(() => {
    if (activeView !== "Chat" || !submittedTask || startedManagerTaskRef.current === submittedTask) return;
    startedManagerTaskRef.current = submittedTask;
    setActiveView("Office");
    setOfficeFocus("DeepDiscuss Room");
    if (configuredCount) startDeepDiscussMutation.mutate({ task: submittedTask });
  }, [activeView, configuredCount, startDeepDiscussMutation, submittedTask]);

  const chooseWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (workspaceInput.trim()) selectWorkspaceMutation.mutate({ path: workspaceInput.trim() });
  };

  const uploadFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1];
      if (base64) uploadMutation.mutate({ fileName: file.name, mimeType: file.type || "application/octet-stream", base64, why: "Owner uploaded a file to the selected workspace.", ownerConfirmed: true });
    };
    reader.readAsDataURL(file);
  };

  const inspectAttachedImage = () => {
    if (uploadedAttachment) inspectImageMutation.mutate({ path: uploadedAttachment, prompt: submittedTask || "Inspect this visual reference and identify observable UI and implementation details for the development team." });
  };

  const renderOfficeLegacy = () => (
    <div className="space-y-5">
      <section className="office-hero overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-7">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Local-first AI development workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">AetherOffice HQ</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Your AI company is ready. Configure at least one provider, select a workspace, and begin an owner-approved DeepDiscuss meeting.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[368px]">
            <Metric label="Providers" value={`${configuredCount} / 8`} sublabel="configured" />
            <Metric label="Team" value="6" sublabel="available" />
            <Metric label="Mode" value="Safe" sublabel="approval first" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Company floor</p>
              <p className="mt-1 text-xs text-slate-400">Live employee states reflect actual provider and tool activity.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Engine standing by
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {liveEmployees.map((employee) => (
              <article key={employee.name} className="employee-room group rounded-xl border border-white/[0.08] p-4 transition-transform duration-200 hover:-translate-y-0.5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-xs font-bold text-slate-950", employee.accent)}>
                    {employee.shortName}
                  </div>
                  <StatusPill status={employee.status} />
                </div>
                <p className="text-sm font-semibold text-white">{employee.name}</p>
                <p className="mt-0.5 text-xs text-sky-200">{employee.role}</p>
                <p className="mt-3 text-xs leading-5 text-slate-400">{employee.focus}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Activity stream</p>
              <p className="mt-1 text-xs text-slate-400">Verified events only</p>
            </div>
            <Activity className="h-4 w-4 text-sky-300" />
          </div>
          {dashboard?.activities.length ? <div className="mt-5 space-y-2">{dashboard.activities.slice(0, 5).map((activity) => <div key={activity.id} className="rounded-lg border border-white/[0.07] bg-black/10 p-3"><p className="text-xs leading-5 text-slate-300">{activity.message}</p><p className="mt-1 text-[10px] text-slate-500">{new Date(activity.createdAt).toLocaleTimeString()}</p></div>)}</div> : <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center"><p className="text-sm font-medium text-slate-300">No activity yet</p><p className="mt-2 text-xs leading-5 text-slate-500">Events appear only after a real meeting, tool call, approval, or execution begins.</p></div>}
          <Separator className="my-5 bg-white/10" />
          <div className="space-y-3 text-xs text-slate-400">
            <div className="flex items-center justify-between"><span>Workspace</span><span className="font-medium text-slate-200">{workspaceLabel}</span></div>
            <div className="flex items-center justify-between"><span>Approval</span><span className="font-medium text-slate-200">{mode}</span></div>
            <div className="flex items-center justify-between"><span>Remote push</span><span className="font-medium text-emerald-300">Disabled</span></div>
          </div>
        </aside>
      </section>
    </div>
  );

  const renderOffice = () => {
    const focusedEmployee = liveEmployees.find((employee) => employee.name === officeFocus || (officeFocus === "Manager" && employee.name === "Manus"));
    const employeeTarget = officeFocus?.replace(/ (Desk|Laptop|Computer|Room)$/, "");
    const relatedEmployee = focusedEmployee ?? liveEmployees.find((employee) => employee.name === employeeTarget);
    const isEmployeeRoom = Boolean(relatedEmployee && officeFocus === `${relatedEmployee.name} Room`);
    const isEmployeeComputer = Boolean(relatedEmployee && officeFocus === `${relatedEmployee.name} Computer`);
    const roomActivity = officeFocus === "DeepDiscuss Room" ? (latestMeeting ? `Meeting state: ${latestMeeting.state.replaceAll("_", " ")}. ${latestMeeting.messages.length} verified discussion message(s) recorded.` : "No verified DeepDiscuss meeting is active.") : officeFocus === "Test Lab" ? (runTestsMutation.data ? `Last controlled test command: ${runTestsMutation.data.command}` : "No controlled test run has occurred.") : officeFocus === "Lounge" ? (liveEmployees.some((employee) => employee.status === "WAITING") ? "One or more employees are genuinely waiting for the next verified task event." : "No employee is currently waiting in the lounge.") : undefined;
    const verifiedActivity = relatedEmployee ? dashboard?.activities.find((event) => event.employee === relatedEmployee.name)?.message : roomActivity;
    const providerStatus = relatedEmployee ? providerStatuses.find((provider) => provider.label === relatedEmployee.name) : undefined;
    const providerLabel = providerStatus?.label ?? "Unconfigured";
    const providerModel = providerStatus?.model;
    browserTestBridge.canRun = Boolean(latestMeeting?.state === "APPROVED" && ownerConfirmed && projectPreviewQuery.data?.url);
    browserTestBridge.testing = runProjectBrowserTestMutation.isPending;
    browserTestBridge.run = (scenario) => {
      if (!latestMeeting || latestMeeting.state !== "APPROVED" || !ownerConfirmed) return;
      runProjectBrowserTestMutation.mutate({ meetingId: latestMeeting.id, ownerConfirmed: true, scenario });
    };
    return <div className={officeFocus ? "space-y-5" : ""}><LiveOffice employees={liveEmployees} onOpenManager={() => setOfficeFocus("Manager Cabin")} onDeskFiles={() => setOfficeFocus("Manager Desk Files")} onProviderLocker={() => setActiveView("Settings")} onExitDoor={() => setExitPanelOpen(true)} onOpenEmployeeRoom={(employee) => setOfficeFocus(`${employee} Room`)} onInspectEmployeeComputer={(employee) => setOfficeFocus(`${employee} Computer`)} onInspect={setOfficeFocus} managementPanel={<aside className="office-bottom-panel" aria-label="Office management panel"><div className="office-exit-panel-head"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">Office exit</p><h2 className="mt-1 text-lg font-semibold text-white">Management panel</h2></div><button type="button" onClick={() => setExitPanelOpen(false)} className="office-panel-close" aria-label="Close management panel">×</button></div><p className="mt-2 text-xs leading-5 text-slate-400">This panel opens only from the physical exit door. The default office launch remains free of visible navigation.</p><div className="mt-5 grid gap-2"><button type="button" onClick={() => { setExitPanelOpen(false); setActiveView("Settings"); }} className="office-panel-action"><Settings2 className="h-4 w-4" /><span><strong>Settings &amp; Connections</strong><small>Manage encrypted providers and employee connections.</small></span></button><button type="button" onClick={() => { setExitPanelOpen(false); setOfficeFocus("Manager Desk Files"); }} className="office-panel-action"><Files className="h-4 w-4" /><span><strong>Manager files &amp; photos</strong><small>Use the physical desk-file flow to import workspace material.</small></span></button><button type="button" onClick={() => { setExitPanelOpen(false); setActiveView("Employees"); }} className="office-panel-action"><UsersRound className="h-4 w-4" /><span><strong>Employee roster</strong><small>Inspect only configured, real runtime employees.</small></span></button><div className="office-provision-card"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Provision employees</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Create 1–5 local employee profiles from one provider already configured in Settings &amp; Connections. No key is requested here.</p><div className="mt-3 grid grid-cols-2 gap-2"><select value={provisionProvider} onChange={(event) => setProvisionProvider(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-xs text-slate-200"><option value="gemini">Gemini</option><option value="mistral">Mistral</option><option value="deepseek">DeepSeek</option><option value="grok">Grok</option><option value="sambanova">SambaNova</option><option value="northmini">North Mini Code</option><option value="nemotron">Nemotron 3 Ultra</option></select><input type="number" min={1} max={5} value={provisionCount} onChange={(event) => setProvisionCount(Math.min(5, Math.max(1, Number(event.target.value) || 1)))} className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-xs text-slate-200" /></div><label className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-400"><input type="checkbox" checked={provisionConfirmed} onChange={(event) => setProvisionConfirmed(event.target.checked)} className="mt-0.5" />I confirm these are real employees backed by the selected configured provider.</label><button type="button" disabled={!provisionConfirmed || provisionEmployeesMutation.isPending} onClick={() => provisionEmployeesMutation.mutate({ provider: provisionProvider as any, count: provisionCount, ownerConfirmed: true })} className="mt-3 w-full rounded-lg bg-sky-300/15 px-3 py-2 text-xs font-semibold text-sky-100 disabled:cursor-not-allowed disabled:opacity-40">{provisionEmployeesMutation.isPending ? "Provisioning…" : "Create employees"}</button>{provisionEmployeesMutation.error ? <p className="mt-2 text-[11px] text-rose-300">{provisionEmployeesMutation.error.message}</p> : null}</div></div></aside>} />{officeFocus ? <section className="rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{officeFocus}</p>{officeFocus === "Manager Cabin" ? <><h2 className="mt-2 text-lg font-semibold text-white">Manager Cabin</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Click the Manager character to speak with them, the physical files and photos on the desk to provide materials, or the small Provider Locker to configure AI keys locally.</p></> : officeFocus === "Manager Desk Files" ? <><h2 className="mt-2 text-lg font-semibold text-white">Manager requested files or photos</h2><p className="mt-2 text-sm leading-6 text-slate-200">Please provide any files, photos, screenshots, or reference materials needed for the current work.</p><label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-sky-300/35 bg-sky-300/[0.05] px-4 py-7 text-center text-sm text-sky-100 hover:bg-sky-300/[0.1]"><input type="file" className="sr-only" onChange={(event) => uploadFile(event.target.files?.[0])} />Click here to choose a file or photo</label>{uploadedAttachment ? <p className="mt-3 text-xs text-emerald-200">Provided to the Manager: {uploadedAttachment}</p> : null}{uploadMutation.error ? <p className="mt-3 text-xs text-rose-300">Choose a local workspace first so the Manager can import this material safely.</p> : null}</> : officeFocus === "Manager" ? <><h2 className="mt-2 text-lg font-semibold text-white">Manager · Manus</h2><p className="mt-2 text-sm leading-6 text-slate-200">Work is going, sir. Do you want to change, edit, or give more information?</p><form onSubmit={(event) => { event.preventDefault(); const command = managerCommand.trim(); if (!command) return; setSubmittedTask(command); setManagerCommand(""); setActiveView("Chat"); }} className="mt-4"><Input value={managerCommand} onChange={(event) => setManagerCommand(event.target.value)} placeholder="Type your instruction and press Enter…" className="border-white/10 bg-black/20 text-slate-100" /><p className="mt-2 text-[11px] text-slate-500">Press Enter to send a change, edit request, or more information to the Manager.</p></form></> : isEmployeeRoom ? <><h2 className="mt-2 text-lg font-semibold text-white">{relatedEmployee!.name}&apos;s Room</h2><p className="mt-2 text-sm text-slate-300">{relatedEmployee!.role} · {relatedEmployee!.status}</p><p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">This personal room shows the employee’s real current work and its authorized isolated sandbox. Tap the computer in the office for a focused live-work view.</p></> : isEmployeeComputer ? <><h2 className="mt-2 text-lg font-semibold text-white">{relatedEmployee!.name}&apos;s Computer</h2><p className="mt-2 text-sm text-slate-300">Live current work only · {relatedEmployee!.status}</p><p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">This view refreshes from current authorized sandbox state, controlled terminal processes, output, and file activity. It never invents activity or executes commands on the host.</p></> : <><h2 className="mt-2 text-lg font-semibold text-white">{officeFocus}</h2><p className="mt-2 text-sm text-slate-300">{relatedEmployee ? `${relatedEmployee.role} · ${relatedEmployee.status}` : "Room status"}</p><p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">{verifiedActivity || "No verified activity has been recorded for this room or employee yet."}</p></>}</div><Button type="button" size="sm" variant="outline" onClick={() => setOfficeFocus(null)} className="border-white/10 bg-white/[0.03] text-slate-200">Back to office</Button></div>{relatedEmployee ? <>{(isEmployeeRoom || isEmployeeComputer || officeFocus?.endsWith(" Desk") || officeFocus?.endsWith(" Laptop")) ? <EmployeeInspectionPanel employee={relatedEmployee} providerLabel={providerLabel} providerModel={providerModel} snapshot={employeeInspectionQuery.data} gitDiff={gitDiffQuery.data} /> : null}{isEmployeeRoom ? <EmployeeSandboxRoom employee={relatedEmployee.name} /> : null}</> : null}{officeFocus === "Test Lab" ? <><ProjectPreviewPanel preview={projectPreviewQuery.data} draftUrl={projectPreviewUrl} onDraftUrlChange={setProjectPreviewUrl} onConfigure={() => configureProjectPreviewMutation.mutate({ url: projectPreviewUrl.trim() })} saving={configureProjectPreviewMutation.isPending} /><ProofReportPanel report={generateProofReportMutation.data ?? latestProofReportQuery.data} generating={generateProofReportMutation.isPending} onGenerate={() => generateProofReportMutation.mutate()} /><EvidenceGalleryPanel /></> : null}{configureProjectPreviewMutation.error ? <p className="mt-3 text-xs text-rose-300">Only a valid loopback HTTP URL with a port can be opened as a project preview.</p> : null}{generateProofReportMutation.error ? <p className="mt-3 text-xs text-rose-300">A proof report could not be generated because a local workspace is not currently available.</p> : null}{officeFocus === "DeepDiscuss Room" && latestMeeting ? <MeetingCollaborationPulse meeting={latestMeeting} /> : null}<VerifiedActivityTimeline activities={dashboard?.activities ?? []} /></section> : null}</div>;
  };

  const renderOfficeControl = () => {
    const focusEmployeeName = officeFocus?.replace(/ (Desk|Laptop|Computer|Room)$/, "");
    const relatedEmployee = liveEmployees.find((employee) => employee.name === focusEmployeeName);
    const isEmployeeRoom = Boolean(relatedEmployee && officeFocus === `${relatedEmployee.name} Room`);
    const isEmployeeComputer = Boolean(relatedEmployee && officeFocus === `${relatedEmployee.name} Computer`);
    const providerStatus = relatedEmployee ? providerStatuses.find((provider) => provider.label === relatedEmployee.name) : undefined;
    const managers = (dashboard?.employees ?? []).filter((employee) => ["Manus", "Atlas", "Nova"].includes(employee.id));
    const startTaskFromControl = (nextTask: string) => {
      setSubmittedTask(nextTask);
      setOfficeFocus("DeepDiscuss Room");
      startDeepDiscussMutation.mutate({ task: nextTask });
      setManagerTaskCandidate(null);
    };
    const sendManagerMessage = (message: string) => {
      setManagerMessages((messages) => [...messages, { role: "owner", content: message }]);
      managerChatMutation.mutate({ message });
    };
    const speakManagerReply = (message: string) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    };
    return <div className="office-game-world"><LiveOffice
      employees={liveEmployees}
      onOpenManager={() => undefined}
      onDeskFiles={() => undefined}
      onProviderLocker={() => setActiveView("Settings")}
      onExitDoor={() => undefined}
      onOpenEmployeeRoom={(employee) => setOfficeFocus(`${employee} Room`)}
      onInspectEmployeeComputer={(employee) => setOfficeFocus(`${employee} Computer`)}
      onInspect={setOfficeFocus}
      onOpenEmptyFloor={() => setShowWorldControls(true)}
      showManagerCabin={false}
      sideControl={<OfficeControlChatbox
        managers={managers}
        messages={managerMessages}
        taskCandidate={managerTaskCandidate}
        chatPending={managerChatMutation.isPending}
        taskPending={startDeepDiscussMutation.isPending}
        error={managerChatMutation.error?.message ?? startDeepDiscussMutation.error?.message}
        onSendMessage={sendManagerMessage}
        onStartProposedTask={() => managerTaskCandidate && startTaskFromControl(managerTaskCandidate)}
        onSpeak={speakManagerReply}
        onUpload={uploadFile}
      />}
    />
    <section className="office-room-trail" aria-label="Employee rooms along the office route"><div><p>SCROLL THE OFFICE WORLD</p><h2>Explore each employee room</h2><span>Every room opens only the selected employee’s real current work and authorized sandbox state.</span></div><div className="office-room-trail-grid">{liveEmployees.map((employee) => <button type="button" key={employee.name} onClick={() => setOfficeFocus(`${employee.name} Room`)}><span>{employee.shortName}</span><div><strong>{employee.name}&apos;s room</strong><small>{employee.status} · {employee.role}</small></div><i>Enter</i></button>)}</div></section>
    {showWorldControls ? <OfficeWorldControls providers={providerStatuses} approvalMode={mode as "Safe Mode" | "Team Mode" | "Autonomous Mode"} provisionPending={provisionEmployeesMutation.isPending} onConfigureProvider={setSetupProvider} onProvision={(provider, count) => provisionEmployeesMutation.mutate({ provider, count, ownerConfirmed: true })} onSetApprovalMode={(nextMode) => { setMode(nextMode); approvalModeMutation.mutate({ mode: nextMode }); }} onOpenSettings={() => setActiveView("Settings")} onOpenRoster={() => setActiveView("Employees")} onClose={() => setShowWorldControls(false)} /> : null}
    {officeFocus ? <section className="mx-auto w-full max-w-[1120px] rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{officeFocus}</p>{isEmployeeRoom ? <><h2 className="mt-2 text-lg font-semibold text-white">{relatedEmployee!.name}&apos;s Room</h2><p className="mt-2 text-sm text-slate-300">{relatedEmployee!.role} · {relatedEmployee!.status}</p><p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">This room shows the employee’s real current work and authorized isolated sandbox. Tap the computer on the office map for a focused live-work view.</p></> : isEmployeeComputer ? <><h2 className="mt-2 text-lg font-semibold text-white">{relatedEmployee!.name}&apos;s Computer</h2><p className="mt-2 text-sm text-slate-300">Live current work only · {relatedEmployee!.status}</p><p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">This view refreshes from current authorized sandbox state, controlled terminal processes, bounded output, and controlled file activity. No activity is fabricated.</p></> : <><h2 className="mt-2 text-lg font-semibold text-white">{officeFocus}</h2><p className="mt-2 text-sm text-slate-300">{officeFocus === "DeepDiscuss Room" ? "Current meeting activity appears only after a real provider-backed discussion starts." : "Select a worker cabin or computer to inspect the real employee runtime."}</p></>}</div><Button type="button" size="sm" variant="outline" onClick={() => setOfficeFocus(null)} className="border-white/10 bg-white/[0.03] text-slate-200">Back to office</Button></div>{relatedEmployee ? <>{(isEmployeeRoom || isEmployeeComputer) ? <EmployeeInspectionPanel employee={relatedEmployee} providerLabel={providerStatus?.label ?? "Unconfigured"} providerModel={providerStatus?.model} snapshot={employeeInspectionQuery.data} gitDiff={gitDiffQuery.data} /> : null}{isEmployeeRoom ? <EmployeeSandboxRoom employee={relatedEmployee.name} /> : null}</> : null}{officeFocus === "DeepDiscuss Room" && latestMeeting ? <MeetingCollaborationPulse meeting={latestMeeting} /> : null}<VerifiedActivityTimeline activities={dashboard?.activities ?? []} /></section> : null}</div>;
  };

  const renderChat = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-sm font-semibold text-white">DeepDiscuss</p>
            <p className="mt-1 text-xs text-slate-400">Four rounds: analysis, critique, debate, and synthesis.</p>
          </div>
          <Badge className={cn(configuredCount ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/10" : "border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/10")}>{configuredCount ? `${configuredCount} provider${configuredCount === 1 ? "" : "s"} ready` : "Awaiting provider configuration"}</Badge>
        </div>
        <div className="flex min-h-[360px] flex-col justify-end py-6">
          {latestMeeting?.messages.length ? <div className="mb-5 space-y-2 rounded-xl border border-white/[0.08] bg-black/10 p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">DeepDiscuss transcript</p><span className="text-[10px] text-sky-200">{latestMeeting.messages.at(-1)?.round ?? "analysis"}</span></div><div className="max-h-56 space-y-2 overflow-auto pr-1">{latestMeeting.messages.filter((message) => message.round !== "synthesis").map((message) => <article key={message.id} className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-sky-100">{message.employee}</p><span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{message.round}</span></div><p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-300">{message.content}</p></article>)}</div></div> : null}
          {latestMeeting?.proposal ? (
            <div className="space-y-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.07] p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">TEAM PROPOSAL</p><Badge className="border-white/10 bg-white/[0.07] text-slate-200 hover:bg-white/[0.07]">{latestMeeting.state.replaceAll("_", " ")}</Badge></div>
              <ProposalSection label="objective" values={[latestMeeting.proposal.objective]} />
              <ProposalSection label="tech stack" values={latestMeeting.proposal.techStack} />
              <ProposalSection label="files to create/modify" values={latestMeeting.proposal.filesToCreateModify} />
              <ProposalSection label="risks" values={latestMeeting.proposal.risks} />
              <ProposalSection label="confidence %" values={[`${latestMeeting.proposal.confidencePercent}%`]} />
              {latestMeeting.state === "PENDING_APPROVAL" ? <div className="flex flex-wrap gap-2 pt-1"><Button size="sm" onClick={() => proposalActionMutation.mutate({ meetingId: latestMeeting.id, action: "Approve" })} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">Approve</Button><Button size="sm" variant="outline" onClick={() => proposalActionMutation.mutate({ meetingId: latestMeeting.id, action: "Modify Plan" })} className="border-amber-300/25 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15">Modify Plan</Button><Button size="sm" variant="outline" onClick={() => proposalActionMutation.mutate({ meetingId: latestMeeting.id, action: "Reject" })} className="border-rose-300/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/15">Reject</Button></div> : null}
            </div>
          ) : submittedTask ? (
            <div className="rounded-xl border border-sky-300/15 bg-sky-300/[0.07] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Owner task staged</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">{submittedTask}</p>
              <p className="mt-3 text-xs leading-5 text-slate-400">The task has not been sent to any AI provider. Start the meeting to create real deliberation records.</p>
              {startDeepDiscussMutation.error ? <p className="mt-3 text-xs text-rose-300">The meeting could not start. Configure a provider and then issue the task again through the Manager.</p> : null}
              <p className="mt-3 text-xs leading-5 text-slate-400">Manager-submitted work enters the private Discussion Room automatically when a provider is configured.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-sky-300/15 bg-sky-300/[0.08] text-sky-200"><MessageSquareMore className="h-5 w-5" /></div>
              <h2 className="text-lg font-semibold text-white">Start with an owner task</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">DeepDiscuss does not invent a conversation. It starts only when a configured provider receives your task.</p>
            </div>
          )}
        </div>
        <form onSubmit={handleTaskSubmit} className="rounded-xl border border-white/10 bg-black/15 p-2">
          <div className="flex gap-2">
            <Input value={task} onChange={(event) => setTask(event.target.value)} placeholder="Describe a project task for the AI company…" className="border-0 bg-transparent text-slate-100 placeholder:text-slate-500 focus-visible:ring-0" />
            <label className="flex cursor-pointer items-center justify-center rounded-md border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/[0.06]"><input type="file" className="sr-only" onChange={(event) => uploadFile(event.target.files?.[0])} />Attach</label>
            <Button type="submit" className="bg-sky-300 text-slate-950 hover:bg-sky-200"><Plus className="mr-1.5 h-4 w-4" />Stage task</Button>
          </div>
          {uploadedAttachment ? <div className="px-2 pb-1 pt-2"><p className="text-[11px] text-emerald-200">Attached to selected workspace: {uploadedAttachment}</p>{/\.(png|jpe?g|webp|gif)$/i.test(uploadedAttachment) ? <Button type="button" size="sm" variant="outline" disabled={inspectImageMutation.isPending} onClick={inspectAttachedImage} className="mt-2 border-sky-300/20 bg-sky-300/[0.06] text-sky-100 hover:bg-sky-300/[0.12]">{inspectImageMutation.isPending ? "Inspecting visual…" : "Inspect image with Manus"}</Button> : null}</div> : null}
          {visionAnalysis ? <div className="mx-2 mb-2 rounded-lg border border-violet-300/15 bg-violet-300/[0.06] p-3 text-xs leading-5 text-violet-100"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200">Vision analysis</p>{visionAnalysis}</div> : null}
          {inspectImageMutation.error ? <p className="px-2 pb-1 pt-2 text-[11px] text-rose-300">The visual reference could not be inspected. Confirm that it is an uploaded PNG, JPG, WEBP, or GIF.</p> : null}
          {uploadMutation.error ? <p className="px-2 pb-1 pt-2 text-[11px] text-rose-300">The attachment could not be imported. Select a workspace and use a supported file type.</p> : null}
        </form>
      </section>

      <aside className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">
        <p className="text-sm font-semibold text-white">Meeting protocol</p>
        <div className="mt-5 space-y-3">
          {[
            ["01", "Independent analysis"],
            ["02", "Cross-critique"],
            ["03", "Debate"],
            ["04", "Manus synthesis"],
          ].map(([index, label]) => (
            <div key={index} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-sky-200">{index}</span>
              <span className="text-xs font-medium text-slate-300">{label}</span>
            </div>
          ))}
        </div>
        <Separator className="my-5 bg-white/10" />
        <p className="text-xs leading-5 text-slate-400">The final TEAM PROPOSAL is produced only after genuine provider responses. Files remain untouched until an owner approval action is recorded.</p>
      </aside>
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-sm font-semibold text-white">Providers</p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">Provider secrets belong only to the local backend configuration. Key values are never read back into the browser, rendered in UI, printed to logs, or added to Git.</p>
          </div>
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {providers.map((provider) => {
            const status = providerStatuses.find((item) => item.label === provider);
            return (
              <div key={provider} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-sky-200"><Bot className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{provider}</p>
                    <p className={cn("mt-0.5 text-xs", status?.availability === "retired-gated" ? "text-amber-300" : status?.configured ? "text-emerald-300" : "text-slate-500")}>{status?.availability === "retired-gated" ? "Retired compatibility route" : status?.configured ? "Configured" : "Not configured"}</p>
                    {status?.compatibilityWarning ? <p className="mt-1 max-w-56 text-[10px] leading-4 text-amber-200">{status.compatibilityWarning}</p> : null}
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={provider === "Manus"} onClick={() => setSetupProvider(provider)} className="border-white/10 bg-white/[0.03] text-xs text-slate-200 hover:bg-white/[0.08]">{status?.availability === "retired-gated" ? "Review" : status?.configured ? "Update" : "Set up"}</Button>
              </div>
            );
          })}
        </div>
      </section>
      <aside className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">
        <p className="text-sm font-semibold text-white">Approval controls</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">Safe Mode remains the default. It requires recorded approval before every meaningful change.</p>
        <div className="mt-5 space-y-2">
          {["Safe Mode", "Team Mode", "Autonomous Mode"].map((option) => (
            <button key={option} onClick={() => { setMode(option); approvalModeMutation.mutate({ mode: option as "Safe Mode" | "Team Mode" | "Autonomous Mode" }); }} className={cn("w-full rounded-xl border px-3 py-3 text-left text-xs transition-colors", mode === option ? "border-sky-300/30 bg-sky-300/[0.09] text-sky-100" : "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:bg-white/[0.05]")}>
              <span className="block font-semibold">{option}</span>
              <span className="mt-1 block leading-5 opacity-70">{option === "Safe Mode" ? "Approve each meaningful file change." : option === "Team Mode" ? "Approve a plan, then allow scoped execution." : "Allow configured work within explicit workspace permissions."}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );

  const renderFiles = () => (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">
        <p className="text-sm font-semibold text-white">Local workspace</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">AetherOffice scopes all project tools to this directory. The CLI selects it automatically; you may also choose it here.</p>
        <form onSubmit={chooseWorkspace} className="mt-4 space-y-2"><Input value={workspaceInput} onChange={(event) => setWorkspaceInput(event.target.value)} placeholder="/path/to/project" className="border-white/10 bg-black/20 text-slate-100" /><Button type="submit" disabled={!workspaceInput.trim() || selectWorkspaceMutation.isPending} className="w-full bg-sky-300 text-slate-950 hover:bg-sky-200">{selectWorkspaceMutation.isPending ? "Selecting…" : "Select workspace"}</Button></form>
        {selectWorkspaceMutation.error ? <p className="mt-3 text-xs text-rose-300">The path could not be selected. It must be an accessible local directory.</p> : null}
        {workspaceQuery.data?.selected ? <><Separator className="my-5 bg-white/10" /><p className="break-all text-xs leading-5 text-emerald-200">{workspaceQuery.data.root}</p><label className="mt-5 flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08]"><input type="file" className="sr-only" onChange={(event) => uploadFile(event.target.files?.[0])} />Upload file</label>{uploadMutation.error ? <p className="mt-3 text-xs text-rose-300">The file could not be imported. Check its type and size.</p> : null}</> : null}
      </aside>
      <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">
        {!workspaceQuery.data?.selected ? <EmptyWorkspace title="Workspace not selected" detail="Select a local project directory. Files, tools, Git, tests, and AI execution remain restricted until the Owner chooses a workspace." action="Your whole computer is never available by default." /> : <><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Project files</p><p className="mt-1 text-xs text-slate-400">The file list reflects the selected local workspace.</p></div><Button size="sm" variant="outline" onClick={() => directoryQuery.refetch()} className="border-white/10 bg-white/[0.03] text-slate-200">Refresh</Button></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{directoryQuery.data?.map((entry) => <button key={`${entry.type}-${entry.name}`} disabled={entry.type !== "file"} onClick={() => { setSelectedFile(entry.name); setActiveView("Editor"); }} className={cn("flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] p-3 text-left text-xs", entry.type === "file" ? "text-slate-200 hover:bg-white/[0.07]" : "cursor-default text-sky-200")}><span className="text-slate-500">{entry.type === "directory" ? "DIR" : "FILE"}</span><span className="truncate">{entry.name}</span></button>)}</div>{directoryQuery.isLoading ? <p className="mt-5 text-xs text-slate-500">Reading local workspace…</p> : null}</>}</section>
    </div>
  );

  const renderEditor = () => selectedFile ? <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">{selectedFile}</p><p className="mt-1 text-xs text-slate-400">Saving is a controlled operation: an approved TEAM PROPOSAL and explicit owner confirmation are required in Safe Mode.</p></div><Button size="sm" variant="outline" onClick={() => setActiveView("Files")} className="border-white/10 bg-white/[0.03] text-slate-200">Back to files</Button></div><textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} className="mt-5 min-h-[420px] w-full rounded-xl border border-white/[0.08] bg-black/25 p-4 font-mono text-xs leading-6 text-slate-300 outline-none focus:border-sky-300/30" aria-label="Workspace file editor" />{latestMeeting?.state === "APPROVED" ? <div className="mt-4 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={ownerConfirmed} onChange={(event) => setOwnerConfirmed(event.target.checked)} />I confirm this controlled change</label><Button size="sm" disabled={!ownerConfirmed || writeFileMutation.isPending} onClick={() => writeFileMutation.mutate({ path: selectedFile, content: draftContent, who: "Owner", why: "Owner saved a reviewed workspace edit.", meetingId: latestMeeting.id, ownerConfirmed })} className="bg-sky-300 text-slate-950 hover:bg-sky-200">{writeFileMutation.isPending ? "Saving…" : "Save controlled change"}</Button></div> : <p className="mt-4 text-xs text-amber-200">Approve a TEAM PROPOSAL before meaningful workspace edits can be saved.</p>}{writeFileMutation.error ? <p className="mt-3 text-xs text-rose-300">The controlled save was blocked or failed. Review the approval state and workspace rules.</p> : null}</section> : <EmptyWorkspace title="No file open" detail="Choose a file from the selected workspace to inspect and edit it through the approval-gated tool layer." action="Open Files to select a file." />;

  const renderWorkspaceTree = (entries: { name: string; path: string; type: "file" | "directory"; children?: { name: string; path: string; type: "file" | "directory"; children?: unknown[] }[] }[], depth = 0) => <ul className={cn("space-y-1", depth ? "ml-3 border-l border-white/[0.07] pl-2" : "")}>{entries.map((entry) => entry.type === "directory" ? <li key={entry.path}><details open={depth < 1}><summary className="cursor-pointer select-none rounded-md px-2 py-1.5 text-xs font-medium text-sky-100 hover:bg-white/[0.05]">{entry.name}</summary>{renderWorkspaceTree((entry.children ?? []) as typeof entries, depth + 1)}</details></li> : <li key={entry.path}><button type="button" onClick={() => openWorkspaceFile(entry.path)} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs", selectedFile === entry.path ? "bg-sky-300/[0.12] text-sky-100" : "text-slate-300 hover:bg-white/[0.05]")}><span className="font-mono text-[10px] text-slate-500">FILE</span><span className="truncate">{entry.name}</span></button></li>)}</ul>;

  const renderEnhancedFiles = () => (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><p className="text-sm font-semibold text-white">Local workspace</p><p className="mt-1 text-xs leading-5 text-slate-400">AetherOffice scopes all project tools to this directory. The CLI selects it automatically; you may also choose it here.</p><form onSubmit={chooseWorkspace} className="mt-4 space-y-2"><Input value={workspaceInput} onChange={(event) => setWorkspaceInput(event.target.value)} placeholder="/path/to/project" className="border-white/10 bg-black/20 text-slate-100" /><Button type="submit" disabled={!workspaceInput.trim() || selectWorkspaceMutation.isPending} className="w-full bg-sky-300 text-slate-950 hover:bg-sky-200">{selectWorkspaceMutation.isPending ? "Selecting…" : "Select workspace"}</Button></form>{workspaceQuery.data?.selected ? <><Separator className="my-5 bg-white/10" /><p className="break-all text-xs leading-5 text-emerald-200">{workspaceQuery.data.root}</p><label className="mt-5 flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.08]"><input type="file" className="sr-only" onChange={(event) => uploadFile(event.target.files?.[0])} />Upload file</label></> : null}</aside>
      <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">{!workspaceQuery.data?.selected ? <EmptyWorkspace title="Workspace not selected" detail="Select a local project directory. Files, tools, Git, tests, and AI execution remain restricted until the Owner chooses a workspace." action="Your whole computer is never available by default." /> : <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Project file tree</p><p className="mt-1 text-xs text-slate-400">Expand directories to browse the selected local workspace. Opening a file adds an editor tab.</p></div><Button size="sm" variant="outline" onClick={() => { directoryQuery.refetch(); workspaceTreeQuery.refetch(); }} className="border-white/10 bg-white/[0.03] text-slate-200">Refresh</Button></div><Input value={fileSearch} onChange={(event) => setFileSearch(event.target.value)} placeholder="Search workspace file names…" className="mb-4 border-white/10 bg-black/20 text-slate-100" />{normalizedFileSearch.length >= 2 ? <div className="mb-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.05] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Workspace search</p>{fileSearchQuery.data?.length ? <div className="mt-2 flex flex-wrap gap-2">{fileSearchQuery.data.map((path) => <button type="button" key={path} onClick={() => openWorkspaceFile(path)} className="rounded-md border border-white/[0.1] bg-black/15 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/[0.06]">{path}</button>)}</div> : <p className="mt-2 text-xs text-slate-400">{fileSearchQuery.isLoading ? "Searching selected workspace…" : "No matching file names."}</p>}</div> : null}<div className="max-h-[560px] overflow-auto rounded-xl border border-white/[0.08] bg-black/15 p-3">{workspaceTreeQuery.isLoading ? <p className="p-2 text-xs text-slate-500">Reading workspace tree…</p> : workspaceTreeQuery.data?.length ? renderWorkspaceTree(workspaceTreeQuery.data) : <p className="p-2 text-xs text-slate-500">No visible files in the selected workspace.</p>}</div></>}</section>
    </div>
  );

  const renderEnhancedEditor = () => {
    if (!selectedFile) return <EmptyWorkspace title="No file open" detail="Choose a file from the selected workspace to inspect and edit it through the approval-gated tool layer." action="Open Files to select a file." />;
    const searchMatches = editorSearch ? draftContent.split(editorSearch).length - 1 : 0;
    const hasUnsavedChanges = draftContent !== lastSavedContent;
    return <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-white">{selectedFile}</p><span aria-live="polite" className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]", hasUnsavedChanges ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100")}>{hasUnsavedChanges ? "Unsaved changes" : "Saved"}</span></div><p className="mt-1 text-xs text-slate-400">Saving is a controlled operation: an approved TEAM PROPOSAL and explicit owner confirmation are required in Safe Mode.</p></div><Button size="sm" variant="outline" onClick={() => setActiveView("Files")} className="border-white/10 bg-white/[0.03] text-slate-200">Back to files</Button></div><div className="mt-5 grid gap-2 rounded-xl border border-white/[0.08] bg-black/15 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"><Input value={editorSearch} onChange={(event) => setEditorSearch(event.target.value)} placeholder="Find exact text…" className="border-white/10 bg-black/20 text-slate-100" /><Input value={editorReplacement} onChange={(event) => setEditorReplacement(event.target.value)} placeholder="Replace with…" className="border-white/10 bg-black/20 text-slate-100" /><label className="flex items-center gap-2 whitespace-nowrap px-1 text-xs text-slate-300"><input type="checkbox" checked={replaceAllMatches} onChange={(event) => setReplaceAllMatches(event.target.checked)} />All matches</label><Button type="button" size="sm" variant="outline" disabled={!editorSearch || !searchMatches} onClick={prepareReplacement} className="border-sky-300/25 bg-sky-300/[0.06] text-sky-100 hover:bg-sky-300/[0.12]">Preview replacement{searchMatches ? ` (${searchMatches})` : ""}</Button></div><div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={draftHistoryIndex <= 0} onClick={undoDraft} className="border-white/10 bg-white/[0.03] text-slate-200">Undo</Button><Button type="button" size="sm" variant="outline" disabled={draftHistoryIndex < 0 || draftHistoryIndex >= draftHistory.length - 1} onClick={redoDraft} className="border-white/10 bg-white/[0.03] text-slate-200">Redo</Button><p className="text-[11px] text-slate-500">Local edit history keeps the latest 80 draft states and never writes a file by itself.</p></div>{replacementPreview ? <div className="mt-4 rounded-xl border border-sky-300/20 bg-sky-300/[0.05] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-sky-100">Selected replacement review</p><p className="mt-1 text-[11px] text-slate-400">{replacementPreview.matches} match{replacementPreview.matches === 1 ? "" : "es"} for “{replacementPreview.search}” will be changed in the draft only.</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setReplacementPreview(null)} className="border-white/10 bg-white/[0.03] text-slate-200">Reject preview</Button><Button type="button" size="sm" onClick={() => { recordDraft(replacementPreview.after); setReplacementPreview(null); }} className="bg-sky-300 text-slate-950 hover:bg-sky-200">Accept into draft</Button></div></div><div className="mt-3 grid gap-3 lg:grid-cols-2"><pre className="max-h-48 overflow-auto rounded-lg border border-rose-300/15 bg-black/20 p-3 text-[11px] leading-5 text-rose-100">{replacementPreview.before.slice(0, 1800)}{replacementPreview.before.length > 1800 ? "\n…" : ""}</pre><pre className="max-h-48 overflow-auto rounded-lg border border-emerald-300/15 bg-black/20 p-3 text-[11px] leading-5 text-emerald-100">{replacementPreview.after.slice(0, 1800)}{replacementPreview.after.length > 1800 ? "\n…" : ""}</pre></div></div> : null}<textarea value={draftContent} onChange={(event) => recordDraft(event.target.value)} className="mt-5 min-h-[420px] w-full rounded-xl border border-white/[0.08] bg-black/25 p-4 font-mono text-xs leading-6 text-slate-300 outline-none focus:border-sky-300/30" aria-label="Workspace file editor" />{latestMeeting?.state === "APPROVED" ? <div className="mt-4 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={ownerConfirmed} onChange={(event) => setOwnerConfirmed(event.target.checked)} />I confirm this controlled change</label><Button size="sm" disabled={!hasUnsavedChanges || !ownerConfirmed || writeFileMutation.isPending} onClick={() => writeFileMutation.mutate({ path: selectedFile, content: draftContent, who: "Owner", why: "Owner saved a reviewed workspace edit.", meetingId: latestMeeting.id, ownerConfirmed })} className="bg-sky-300 text-slate-950 hover:bg-sky-200">{writeFileMutation.isPending ? "Saving…" : "Save controlled change"}</Button></div> : <p className="mt-4 text-xs text-amber-200">Approve a TEAM PROPOSAL before meaningful workspace edits can be saved.</p>}{writeFileMutation.error ? <p className="mt-3 text-xs text-rose-300">The controlled save was blocked or failed. Review the approval state and workspace rules.</p> : null}</section>;
  };

  const renderDiff = () => <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Reviewable diff</p><p className="mt-1 text-xs text-slate-400">This is the real Git diff from the selected workspace. No remote push is implemented.</p></div><Button size="sm" variant="outline" onClick={() => gitDiffQuery.refetch()} className="border-white/10 bg-white/[0.03] text-slate-200">Refresh</Button></div><pre className="mt-5 min-h-72 max-h-[620px] overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{workspaceQuery.data?.gitAvailable ? gitDiffQuery.data || "No uncommitted diff." : "Select a Git workspace to inspect diffs."}</pre></section>;

  const renderTests = () => <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><p className="text-sm font-semibold text-white">Controlled tests</p><p className="mt-1 text-xs text-slate-400">Test execution runs only in the selected workspace and requires an approved plan plus owner confirmation.</p>{latestMeeting?.state === "APPROVED" ? <div className="mt-5"><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={ownerConfirmed} onChange={(event) => setOwnerConfirmed(event.target.checked)} />I confirm this test run</label><Button size="sm" disabled={!ownerConfirmed || runTestsMutation.isPending} onClick={() => runTestsMutation.mutate({ who: "Owner", why: "Owner initiated the approved workspace test run.", meetingId: latestMeeting.id, ownerConfirmed })} className="mt-3 bg-sky-300 text-slate-950 hover:bg-sky-200">{runTestsMutation.isPending ? "Running tests…" : "Run tests"}</Button></div> : <p className="mt-5 text-xs text-amber-200">Approve a TEAM PROPOSAL before test execution.</p>}<pre className="mt-5 min-h-72 max-h-[500px] overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{runTestsMutation.data ? `${runTestsMutation.data.command}\n\n${runTestsMutation.data.stdout}\n${runTestsMutation.data.stderr}` : "No controlled test run has occurred."}</pre></section>;

  const renderEnhancedTests = () => {
    const execution = executionStatusQuery.data;
    const executionRunning = execution?.status === "running" || execution?.status === "cancelling";
    const canExecute = latestMeeting?.state === "APPROVED" && ownerConfirmed;
    const retriesRemaining = Math.max(0, 3 - executionAttempts);
    const output = execution ? `$ ${execution.command} ${execution.args.join(" ")}\nstatus: ${execution.status}${execution.exitCode === null ? "" : ` · exit ${execution.exitCode}`}\n\n${execution.stdout}${execution.stderr ? `\n${execution.stderr}` : ""}` : "No controlled execution has started.";
    return <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">Controlled command console</p><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Only selected-workspace executions are allowed. Every run is approval-gated, captured in the local audit log, limited to 120 seconds, and cannot invoke a shell.</p></div><Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/10">No remote execution</Badge></div><div className="mt-5 rounded-xl border border-sky-300/15 bg-sky-300/[0.05] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200">Explicit permissions</p><p className="mt-2 text-xs leading-5 text-slate-300">Allowed launchers: <span className="font-mono text-sky-100">pnpm, npm, yarn, bun, python, python3, pytest</span>. Shell operators and command chaining are blocked. A run is restricted to the selected workspace and is forcibly stopped after two minutes.</p></div>{latestMeeting?.state === "APPROVED" ? <div className="mt-5 space-y-4"><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={ownerConfirmed} onChange={(event) => setOwnerConfirmed(event.target.checked)} />I confirm this approved workspace execution</label><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!canExecute || Boolean(executionRunning) || startTestsMutation.isPending} onClick={() => beginExecution({ kind: "tests" })} className="bg-sky-300 text-slate-950 hover:bg-sky-200">{startTestsMutation.isPending ? "Starting tests…" : "Run workspace tests"}</Button>{executionRunning && activeExecutionId ? <Button size="sm" variant="outline" disabled={cancelExecutionMutation.isPending} onClick={() => cancelExecutionMutation.mutate({ id: activeExecutionId, who: "Owner", why: "Owner cancelled the active controlled workspace execution." })} className="border-rose-300/25 bg-rose-300/[0.08] text-rose-100 hover:bg-rose-300/[0.14]">{cancelExecutionMutation.isPending ? "Cancelling…" : "Cancel run"}</Button> : null}{lastExecutionRequest && execution && (execution.status === "failed" || execution.status === "cancelled") ? <Button size="sm" variant="outline" disabled={!canExecute || retriesRemaining === 0 || startCommandMutation.isPending || startTestsMutation.isPending} onClick={() => beginExecution(lastExecutionRequest, true)} className="border-amber-300/25 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/[0.14]">Retry ({retriesRemaining} left)</Button> : null}</div><div className="grid gap-2 rounded-xl border border-white/[0.08] bg-black/15 p-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]"><Input value={commandName} onChange={(event) => setCommandName(event.target.value)} aria-label="Allowed command name" placeholder="pnpm" className="border-white/10 bg-black/20 font-mono text-slate-100" /><Input value={commandArgs} onChange={(event) => setCommandArgs(event.target.value)} aria-label="Command arguments" placeholder="test" className="border-white/10 bg-black/20 font-mono text-slate-100" /><Button size="sm" variant="outline" disabled={!canExecute || Boolean(executionRunning) || !commandName.trim() || startCommandMutation.isPending} onClick={() => beginExecution({ kind: "command", command: commandName.trim(), args: commandArgs.trim() ? commandArgs.trim().split(/\s+/) : [] })} className="border-white/10 bg-white/[0.03] text-slate-100">Run allowed command</Button></div></div> : <p className="mt-5 text-xs text-amber-200">Approve a TEAM PROPOSAL before executing a bounded workspace command or test.</p>}<pre aria-live="polite" className="mt-5 min-h-72 max-h-[500px] overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{output}</pre>{startCommandMutation.error || startTestsMutation.error ? <p className="mt-3 text-xs text-rose-300">The execution was blocked or could not start. Review the displayed permission boundary and approval state.</p> : null}</section>;
  };

  const renderEnhancedGit = () => {
    if (!workspaceQuery.data?.gitAvailable) return <EmptyWorkspace title="Git workspace unavailable" detail="Select a directory that contains a Git repository to inspect branch status, diffs, history, guarded commit actions, and guarded local reverts." action="Automatic remote push is permanently disabled." />;
    const status = gitStatusQuery.data ?? "";
    const branch = status.match(/^##\s+([^\s.]+)(?:\.\.\.)?/m)?.[1] ?? "Detached HEAD";
    return <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">Git workspace</p><p className="mt-1 text-xs text-slate-400">All history actions stay local. This application has no remote-push capability.</p></div><div className="flex items-center gap-2"><Badge className="border-sky-300/20 bg-sky-300/[0.08] font-mono text-sky-100 hover:bg-sky-300/[0.08]"><GitBranch className="mr-1.5 h-3 w-3" />{branch}</Badge><Button size="sm" variant="outline" onClick={() => { gitStatusQuery.refetch(); gitDiffQuery.refetch(); gitHistoryQuery.refetch(); }} className="border-white/10 bg-white/[0.03] text-slate-200">Refresh</Button></div></div><div className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs leading-5 text-emerald-100">Remote push is permanently disabled. Commits and reverts run only against this selected local repository, after explicit Owner confirmation.</div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Branch status</p><pre className="min-h-40 overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{status || "Clean working tree."}</pre></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Reviewable diff</p><pre className="min-h-40 overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{gitDiffQuery.data || "No uncommitted diff."}</pre></div></div><div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-xs font-semibold text-white">Create local commit</p><div className="mt-3 flex flex-wrap gap-2"><Input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} placeholder="Commit message" className="max-w-md border-white/10 bg-black/20 text-slate-100" /><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={ownerConfirmed} onChange={(event) => setOwnerConfirmed(event.target.checked)} />I confirm this local Git action</label><Button size="sm" disabled={!commitMessage.trim() || !ownerConfirmed || createCommitMutation.isPending} onClick={() => createCommitMutation.mutate({ message: commitMessage, who: "Owner", why: "Owner created a local commit.", ownerConfirmed })} className="bg-white text-slate-950 hover:bg-slate-200">{createCommitMutation.isPending ? "Committing…" : "Commit locally"}</Button></div></div><div className="mt-5"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Recent local history</p><p className="text-[10px] text-slate-500">Guarded revert creates a new local revert commit.</p></div>{gitHistoryQuery.data?.length ? <div className="space-y-2">{gitHistoryQuery.data.map((commit) => <div key={commit.hash} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-black/15 p-3"><div className="min-w-0 text-xs text-slate-300"><span className="font-mono text-sky-200">{commit.shortHash}</span><span className="ml-3">{commit.subject}</span><span className="ml-3 text-slate-500">{commit.author}</span></div><Button size="sm" variant="outline" disabled={!ownerConfirmed || revertCommitMutation.isPending} onClick={() => revertCommitMutation.mutate({ commit: commit.hash, who: "Owner", why: `Owner reverted local commit ${commit.shortHash}.`, ownerConfirmed })} className="border-rose-300/25 bg-rose-300/[0.06] text-rose-100 hover:bg-rose-300/[0.12]">{revertCommitMutation.isPending ? "Reverting…" : "Revert locally"}</Button></div>)}</div> : <p className="text-xs text-slate-500">No commit history available.</p>}{revertCommitMutation.error ? <p className="mt-3 text-xs text-rose-300">The guarded revert was blocked or failed. Resolve any local conflicts before retrying.</p> : null}</div></section>;
  };

  const renderGit = () => <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">{!workspaceQuery.data?.gitAvailable ? <EmptyWorkspace title="Git workspace unavailable" detail="Select a directory that contains a Git repository to inspect branch status, diffs, history, and guarded commit actions." action="Automatic remote push is permanently disabled." /> : <><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Git workspace</p><p className="mt-1 text-xs text-slate-400">No automatic remote push is implemented. Commits require explicit owner confirmation.</p></div><Button size="sm" variant="outline" onClick={() => { gitStatusQuery.refetch(); gitDiffQuery.refetch(); gitHistoryQuery.refetch(); }} className="border-white/10 bg-white/[0.03] text-slate-200">Refresh</Button></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</p><pre className="min-h-40 overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{gitStatusQuery.data || "Clean working tree."}</pre></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Diff</p><pre className="min-h-40 overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{gitDiffQuery.data || "No uncommitted diff."}</pre></div></div><div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-xs font-semibold text-white">Create local commit</p><div className="mt-3 flex flex-wrap gap-2"><Input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} placeholder="Commit message" className="max-w-md border-white/10 bg-black/20 text-slate-100" /><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={ownerConfirmed} onChange={(event) => setOwnerConfirmed(event.target.checked)} />Confirm</label><Button size="sm" disabled={!commitMessage.trim() || !ownerConfirmed || createCommitMutation.isPending} onClick={() => createCommitMutation.mutate({ message: commitMessage, who: "Owner", why: "Owner created a local commit.", ownerConfirmed })} className="bg-white text-slate-950 hover:bg-slate-200">Commit locally</Button></div></div><div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Recent history</p>{gitHistoryQuery.data?.length ? <div className="space-y-2">{gitHistoryQuery.data.map((commit) => <div key={commit.hash} className="rounded-lg border border-white/[0.08] bg-black/15 p-3 text-xs text-slate-300"><span className="font-mono text-sky-200">{commit.shortHash}</span><span className="ml-3">{commit.subject}</span><span className="ml-3 text-slate-500">{commit.author}</span></div>)}</div> : <p className="text-xs text-slate-500">No commit history available.</p>}</div></>}</section>;

  const renderEmployees = () => <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><p className="text-sm font-semibold text-white">Employee profiles and performance</p><p className="mt-1 text-xs text-slate-400">Statistics update only after a recorded evaluation; no fabricated performance data is shown.</p>{dashboard?.expiredTemporaryEmployees.length ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] p-4 text-xs leading-5 text-amber-100">Temporary assignment ended: {dashboard.expiredTemporaryEmployees.join(", ")}. The expired employee is removed from the office and cannot join new discussions.</div> : null}<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dashboard?.employees.map((employee) => <article key={employee.id} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-white">{employee.id}</p><StatusPill status={employee.status as EmployeeStatus} /></div><p className="mt-3 text-xs text-slate-400">Completed tasks <span className="float-right text-slate-100">{employee.taskCount}</span></p><p className="mt-2 text-xs text-slate-400">Average score <span className="float-right text-slate-100">{employee.averageScore === null ? "—" : employee.averageScore.toFixed(1)}</span></p><p className="mt-2 text-xs text-slate-400">Recent scores <span className="float-right text-slate-100">{employee.recentPerformance.length ? employee.recentPerformance.join(", ") : "—"}</span></p></article>)}</div><div className="mt-5 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] p-4 text-xs leading-5 text-sky-100">Evaluation rubric: Correctness 30%, Requirements 20%, Code Quality 20%, Security 10%, Performance 10%, Maintainability 10%.</div></section>;

  const renderCameras = () => {
    const overlayFor = (employee: (typeof liveEmployees)[number]) => {
      const verifiedCamera = dashboard?.activities.find((activity) => activity.employee === employee.name && activity.camera)?.camera;
      return createLaptopOverlay(employee.status, employee.focus, verifiedCamera);
    };
    const lastEventFor = (employee?: string) => {
      const profile = liveEmployees.find((candidate) => candidate.name === employee);
      return profile ? overlayFor(profile).summary : "No verified activity recorded yet.";
    };
    const inMeeting = liveEmployees.filter((employee) => employee.status === "IN_MEETING");
    return <div className="space-y-5"><section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><div><p className="text-sm font-semibold text-white">Live Cameras</p><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Every camera field is derived from the verified AetherOffice runtime event stream.</p><p className="mt-3 text-xs font-medium text-sky-200">Focused preview: {focusedCamera}</p></div><Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/10"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />Local monitoring active</Badge></section><section className="grid gap-5 xl:grid-cols-2"><CameraCard title="Manager Cabin" subtitle="Manus · orchestration view" status={liveEmployees.find((employee) => employee.name === "Manus")?.status ?? "IDLE"} activity={lastEventFor("Manus")} tint="from-violet-500/20 via-slate-900 to-slate-950" occupants={["Manus"]} onClick={() => setFocusedCamera("Manager Cabin")} selected={focusedCamera === "Manager Cabin"} /><CameraCard title="Meeting Cabin" subtitle="DeepDiscuss collaboration view" status={inMeeting.length ? "IN_MEETING" : "IDLE"} activity={inMeeting.length ? `${inMeeting.map((employee) => employee.name).join(", ")} currently in the meeting cabin.` : "No verified team meeting is active."} tint="from-sky-500/20 via-slate-900 to-slate-950" occupants={inMeeting.map((employee) => employee.name)} onClick={() => setFocusedCamera("Meeting Cabin")} selected={focusedCamera === "Meeting Cabin"} /></section><section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Employee Laptop Cameras</p><p className="mt-1 text-xs text-slate-400">Verified file scope, controlled tool, and task stage per employee.</p></div><TerminalSquare className="h-4 w-4 text-sky-300" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{liveEmployees.map((employee) => { const overlay = overlayFor(employee); return <button type="button" key={employee.name} onClick={() => setFocusedCamera(`${employee.name} laptop`)} className={cn("overflow-hidden rounded-xl border bg-black/20 text-left", focusedCamera === `${employee.name} laptop` ? "border-sky-300/50 ring-1 ring-sky-300/20" : "border-white/[0.08]")}><div className={cn("h-20 bg-gradient-to-br p-3", employee.accent)}><div className="flex items-start justify-between"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950/35 text-xs font-bold text-white">{employee.shortName}</span><StatusPill status={employee.status} /></div></div><div className="space-y-1.5 p-3"><p className="text-xs font-semibold text-white">{employee.name} laptop</p><p className="text-[11px] leading-5 text-slate-300">{overlay.fileScope}</p><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">{overlay.tool} · {overlay.taskStage}</p><p className="text-[10px] leading-4 text-slate-500">{overlay.taskScope}</p></div></button>; })}</div></div><button type="button" onClick={() => setFocusedCamera("Office Floor")} className={cn("rounded-2xl border bg-[#0d1527]/80 p-5 text-left", focusedCamera === "Office Floor" ? "border-sky-300/50 ring-1 ring-sky-300/20" : "border-white/10")}><p className="text-sm font-semibold text-white">Office Floor Camera</p><p className="mt-1 text-xs leading-5 text-slate-400">Current team distribution.</p><div className="mt-5 space-y-2">{liveEmployees.map((employee) => <div key={employee.name} className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2"><span className="text-xs text-slate-200">{employee.name}</span><StatusPill status={employee.status} /></div>)}</div><Separator className="my-5 bg-white/10" /><p className="text-xs leading-5 text-slate-500">Sensitive values, API keys, raw prompts, and unapproved file content are never displayed in camera previews.</p></button></section></div>;
  };

  const renderView = () => {
    if (activeView === "Office") return renderOfficeControl();
    if (activeView === "Cameras") return renderCameras();
    if (activeView === "Chat") return renderChat();
    if (activeView === "Settings") return renderSettings();
    if (activeView === "Files") return renderEnhancedFiles();
    if (activeView === "Editor") return <div className="space-y-3"><div className="flex flex-wrap gap-2" aria-label="Open editor tabs">{openFiles.map((path) => <div key={path} className={cn("flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-xs", selectedFile === path ? "border-sky-300/35 bg-sky-300/[0.1] text-sky-100" : "border-white/[0.08] bg-white/[0.025] text-slate-400")}><button type="button" onClick={() => setSelectedFile(path)} className="max-w-[210px] truncate text-left">{path}</button><button type="button" aria-label={`Close ${path} tab`} onClick={() => closeWorkspaceFile(path)} className="ml-1 rounded px-1 text-slate-400 hover:bg-white/10 hover:text-white">×</button></div>)}</div>{renderEnhancedEditor()}</div>;
    if (activeView === "Diff") return renderDiff();
    if (activeView === "Tests") return renderEnhancedTests();
    if (activeView === "Git") return renderEnhancedGit();
    if (activeView === "Employees") return renderEmployees();
    const details: Record<Exclude<WorkspaceView, "Office" | "Cameras" | "Chat" | "Settings">, [string, string, string]> = {
      Files: ["Workspace not selected", "Select a local project directory from the CLI or local setup screen. AetherOffice will scope all controlled tools to that directory.", "Files remain inaccessible until the Owner selects a workspace."],
      Editor: ["No file open", "The editor shows real workspace files and unsaved changes only after a local project has been selected.", "Choose a workspace first."],
      Diff: ["No proposed changes", "Before/after diffs will appear here when an employee produces a real patch for owner review.", "No modifications occur before approval."],
      Tests: ["No test run", "Visible test output appears only when an approved controlled command is executed inside the selected workspace.", "No command is running."],
      Git: ["Git workspace unavailable", "Branch state, diffs, history, commits, and guarded revert actions will appear after the selected workspace is inspected.", "Automatic remote push is permanently disabled."],
      Employees: ["Employee profiles", "Task counts and evaluation history are populated from real completed work, never fabricated sample performance.", "No completed tasks recorded."],
    };
    const [title, detail, action] = details[activeView as keyof typeof details];
    return <EmptyWorkspace title={title} detail={detail} action={action} />;
  };

  return (
    <div className="aether-shell min-h-screen bg-[#070b16] text-slate-100">
      {/* The office map is the primary navigation; no sidebar is rendered. */}
      <main className="min-h-screen">
        {activeView !== "Office" ? <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-4 border-b border-white/[0.07] bg-[#070b16]/85 px-5 py-3 backdrop-blur-xl sm:px-7">
          <div><p className="text-sm font-semibold text-white">{activeView}</p><p className="mt-0.5 text-xs text-slate-500">Local workspace</p></div>
        </header> : null}
        <div className={activeView === "Office" ? "" : "mx-auto max-w-[1680px] p-5 sm:p-7"}>{renderView()}</div>
      </main>
      {setupProvider ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#02040a]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Configure ${setupProvider}`}>
          <form onSubmit={saveProvider} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1527] p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-5"><div><p className="text-lg font-semibold text-white">Configure {setupProvider}</p><p className="mt-1 text-xs leading-5 text-slate-400">The key is transmitted only to the local backend, encrypted at rest, and never sent back to this browser.</p></div><button type="button" onClick={() => { setSetupProvider(null); setApiKey(""); }} className="text-sm text-slate-400 hover:text-white">Close</button></div>
            <label className="mt-5 block text-xs font-medium text-slate-300">API key<Input required type="password" value={apiKey} autoComplete="new-password" onChange={(event) => setApiKey(event.target.value)} className="mt-2 border-white/10 bg-black/20 text-slate-100" placeholder="Paste key once; it is never displayed again" /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-xs font-medium text-slate-300">Model <span className="font-normal text-slate-500">(optional)</span><Input value={model} onChange={(event) => setModel(event.target.value)} className="mt-2 border-white/10 bg-black/20 text-slate-100" placeholder="Provider model ID" /></label><label className="block text-xs font-medium text-slate-300">Endpoint <span className="font-normal text-slate-500">(optional)</span><Input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="mt-2 border-white/10 bg-black/20 text-slate-100" placeholder="https://…/chat/completions" /></label></div>
            {setupProvider === "Devstral Small 2" ? <label className="mt-4 block rounded-lg border border-amber-300/20 bg-amber-300/[0.08] p-3 text-xs leading-5 text-amber-100"><input className="mr-2" type="checkbox" checked={compatibilityAcknowledged} onChange={(event) => setCompatibilityAcknowledged(event.target.checked)} />I understand Devstral Small 2 is retired by Mistral. I have confirmed that this endpoint and account still support it.</label> : null}
            <p className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] p-3 text-xs leading-5 text-emerald-100">No API keys are saved in frontend state after this form submits, logged by the application, or added to the Git repository.</p>
            {configureProviderMutation.error ? <p className="mt-3 text-xs text-rose-300">The provider could not be saved. Check the local configuration and try again.</p> : null}
            <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSetupProvider(null)} className="border-white/10 bg-white/[0.03] text-slate-200">Cancel</Button><Button type="submit" disabled={!apiKey.trim() || (setupProvider === "Devstral Small 2" && !compatibilityAcknowledged) || configureProviderMutation.isPending} className="bg-sky-300 text-slate-950 hover:bg-sky-200">{configureProviderMutation.isPending ? "Securing…" : "Save securely"}</Button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#071021]/45 p-3"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 text-lg font-semibold leading-none text-white">{value}</p><p className="mt-1 text-[10px] text-slate-400">{sublabel}</p></div>;
}

function CameraCard({ title, subtitle, status, activity, tint, occupants, onClick, selected }: { title: string; subtitle: string; status: EmployeeStatus; activity: string; tint: string; occupants: string[]; onClick: () => void; selected: boolean }) {
  return <button type="button" onClick={onClick} className={cn("overflow-hidden rounded-2xl border bg-[#0d1527]/80 text-left", selected ? "border-sky-300/50 ring-1 ring-sky-300/20" : "border-white/10")}><div className={cn("relative h-44 bg-gradient-to-br p-5", tint)}><div className="absolute inset-4 rounded-xl border border-white/15 bg-black/15" /><div className="relative flex items-start justify-between"><span className="rounded-md border border-white/15 bg-black/25 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-white">LIVE</span><StatusPill status={status} /></div><div className="absolute bottom-5 left-5 right-5"><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs text-slate-300">{subtitle}</p></div></div><div className="p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Verified activity</p><p className="mt-2 text-xs leading-5 text-slate-300">{activity}</p><p className="mt-3 text-[11px] text-sky-200">Occupants: {occupants.length ? occupants.join(", ") : "None"}</p></div></button>;
}

function ProposalSection({ label, values }: { label: string; values: string[] }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><div className="mt-1.5 space-y-1 text-xs leading-5 text-slate-200">{values.map((value, index) => <p key={`${label}-${index}`}>{value}</p>)}</div></div>;
}
