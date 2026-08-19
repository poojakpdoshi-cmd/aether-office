import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createLaptopOverlay } from "@/lib/laptopOverlay";
import { trpc } from "@/lib/trpc";
import { LiveOffice } from "@/components/LiveOffice";
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
    name: "Arcee",
    shortName: "A",
    role: "Quality Reviewer",
    focus: "Security and architecture critique",
    status: "IDLE",
    accent: "from-lime-300 to-emerald-500",
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
];

const providers = ["Manus", "Gemini", "Mistral", "DeepSeek", "Arcee", "Grok", "SambaNova", "OpenRouter"];

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
  const [managerCommand, setManagerCommand] = useState("");
  const startedManagerTaskRef = useRef<string | null>(null);
  const providerQuery = trpc.aether.providers.useQuery();
  const dashboardQuery = trpc.aether.dashboard.useQuery(undefined, { refetchInterval: 1500 });
  const workspaceQuery = trpc.aether.workspace.useQuery(undefined, { refetchInterval: 3000 });
  const approvalModeMutation = trpc.aether.setApprovalMode.useMutation();
  const configureProviderMutation = trpc.aether.configureProvider.useMutation({
    onSuccess: () => {
      setApiKey("");
      setModel("");
      setBaseUrl("");
      setSetupProvider(null);
      providerQuery.refetch();
    },
  });
  const providerStatuses = providerQuery.data ?? [];
  const configuredCount = providerStatuses.filter((provider) => provider.configured).length;
  const dashboard = dashboardQuery.data;
  const latestMeeting = dashboard?.meetings[0];
  const configuredEmployeeNames = new Set(providerStatuses.filter((provider) => provider.configured).map((provider) => provider.id === "sambanova" ? "SambaNova" : provider.label));
  const liveEmployees = employees.filter((employee) => employee.name === "Manus" || configuredEmployeeNames.has(employee.name)).map((employee) => ({
    ...employee,
    status: (dashboard?.employees.find((profile) => profile.id === employee.name)?.status ?? employee.status) as EmployeeStatus,
  }));
  const startDeepDiscussMutation = trpc.aether.startDeepDiscuss.useMutation({ onSuccess: () => dashboardQuery.refetch() });
  const proposalActionMutation = trpc.aether.proposalAction.useMutation({ onSuccess: () => dashboardQuery.refetch() });
  const selectWorkspaceMutation = trpc.aether.selectWorkspace.useMutation({ onSuccess: () => { workspaceQuery.refetch(); directoryQuery.refetch(); workspaceTreeQuery.refetch(); } });
  const directoryQuery = trpc.aether.listDirectory.useQuery({ path: "." }, { enabled: Boolean(workspaceQuery.data?.selected) });
  const workspaceTreeQuery = trpc.aether.workspaceTree.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.selected) });
  const normalizedFileSearch = fileSearch.trim();
  const fileSearchQuery = trpc.aether.searchFiles.useQuery({ query: normalizedFileSearch }, { enabled: Boolean(workspaceQuery.data?.selected && normalizedFileSearch.length >= 2) });
  const fileQuery = trpc.aether.readFile.useQuery({ path: selectedFile ?? "." }, { enabled: Boolean(selectedFile) });
  const gitStatusQuery = trpc.aether.gitStatus.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.gitAvailable) });
  const gitDiffQuery = trpc.aether.gitDiff.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.gitAvailable) });
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
      provider: setupProvider.toLowerCase() as "gemini" | "mistral" | "deepseek" | "arcee" | "grok" | "sambanova" | "openrouter",
      apiKey,
      ...(model.trim() ? { model: model.trim() } : {}),
      ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
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
    const deskEmployee = officeFocus?.endsWith(" Desk") ? officeFocus.replace(" Desk", "") : officeFocus?.endsWith(" Laptop") ? officeFocus.replace(" Laptop", "") : undefined;
    const relatedEmployee = focusedEmployee ?? liveEmployees.find((employee) => employee.name === deskEmployee);
    const roomActivity = officeFocus === "DeepDiscuss Room" ? (latestMeeting ? `Meeting state: ${latestMeeting.state.replaceAll("_", " ")}. ${latestMeeting.messages.length} verified discussion message(s) recorded.` : "No verified DeepDiscuss meeting is active.") : officeFocus === "Test Lab" ? (runTestsMutation.data ? `Last controlled test command: ${runTestsMutation.data.command}` : "No controlled test run has occurred.") : officeFocus === "Lounge" ? (liveEmployees.some((employee) => employee.status === "WAITING") ? "One or more employees are genuinely waiting for the next verified task event." : "No employee is currently waiting in the lounge.") : undefined;
    const verifiedActivity = relatedEmployee ? dashboard?.activities.find((event) => event.employee === relatedEmployee.name)?.message : roomActivity;
    return <div className={officeFocus ? "space-y-5" : ""}><LiveOffice employees={liveEmployees} onOpenManager={() => setOfficeFocus("Manager Cabin")} onDeskFiles={() => setOfficeFocus("Manager Desk Files")} onProviderLocker={() => setActiveView("Settings")} onInspect={setOfficeFocus} />{officeFocus ? <section className="rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">{officeFocus}</p>{officeFocus === "Manager Cabin" ? <><h2 className="mt-2 text-lg font-semibold text-white">Manager Cabin</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Click the Manager character to speak with them, the physical files and photos on the desk to provide materials, or the small Provider Locker to configure AI keys locally.</p></> : officeFocus === "Manager Desk Files" ? <><h2 className="mt-2 text-lg font-semibold text-white">Manager requested files or photos</h2><p className="mt-2 text-sm leading-6 text-slate-200">Please provide any files, photos, screenshots, or reference materials needed for the current work.</p><label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-sky-300/35 bg-sky-300/[0.05] px-4 py-7 text-center text-sm text-sky-100 hover:bg-sky-300/[0.1]"><input type="file" className="sr-only" onChange={(event) => uploadFile(event.target.files?.[0])} />Click here to choose a file or photo</label>{uploadedAttachment ? <p className="mt-3 text-xs text-emerald-200">Provided to the Manager: {uploadedAttachment}</p> : null}{uploadMutation.error ? <p className="mt-3 text-xs text-rose-300">Choose a local workspace first so the Manager can import this material safely.</p> : null}</> : officeFocus === "Manager" ? <><h2 className="mt-2 text-lg font-semibold text-white">Manager · Manus</h2><p className="mt-2 text-sm leading-6 text-slate-200">Work is going, sir. Do you want to change, edit, or give more information?</p><form onSubmit={(event) => { event.preventDefault(); const command = managerCommand.trim(); if (!command) return; setSubmittedTask(command); setManagerCommand(""); setActiveView("Chat"); }} className="mt-4"><Input value={managerCommand} onChange={(event) => setManagerCommand(event.target.value)} placeholder="Type your instruction and press Enter…" className="border-white/10 bg-black/20 text-slate-100" /><p className="mt-2 text-[11px] text-slate-500">Press Enter to send a change, edit request, or more information to the Manager.</p></form></> : <><h2 className="mt-2 text-lg font-semibold text-white">{officeFocus}</h2><p className="mt-2 text-sm text-slate-300">{relatedEmployee ? `${relatedEmployee.role} · ${relatedEmployee.status}` : "Room status"}</p><p className="mt-3 max-w-2xl text-xs leading-5 text-slate-400">{verifiedActivity || "No verified activity has been recorded for this room or employee yet."}</p></>}</div></section> : null}</div>;
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
                    <p className={cn("mt-0.5 text-xs", status?.configured ? "text-emerald-300" : "text-slate-500")}>{status?.configured ? "Configured" : "Not configured"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={provider === "Manus"} onClick={() => setSetupProvider(provider)} className="border-white/10 bg-white/[0.03] text-xs text-slate-200 hover:bg-white/[0.08]">{status?.configured ? "Update" : "Set up"}</Button>
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

  const renderEmployees = () => <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><p className="text-sm font-semibold text-white">Employee profiles and performance</p><p className="mt-1 text-xs text-slate-400">Statistics update only after a recorded evaluation; no fabricated performance data is shown.</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dashboard?.employees.map((employee) => <article key={employee.id} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-white">{employee.id}</p><StatusPill status={employee.status as EmployeeStatus} /></div><p className="mt-3 text-xs text-slate-400">Completed tasks <span className="float-right text-slate-100">{employee.taskCount}</span></p><p className="mt-2 text-xs text-slate-400">Average score <span className="float-right text-slate-100">{employee.averageScore === null ? "—" : employee.averageScore.toFixed(1)}</span></p><p className="mt-2 text-xs text-slate-400">Recent scores <span className="float-right text-slate-100">{employee.recentPerformance.length ? employee.recentPerformance.join(", ") : "—"}</span></p></article>)}</div><div className="mt-5 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] p-4 text-xs leading-5 text-sky-100">Evaluation rubric: Correctness 30%, Requirements 20%, Code Quality 20%, Security 10%, Performance 10%, Maintainability 10%.</div></section>;

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
    if (activeView === "Office") return renderOffice();
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
            <p className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] p-3 text-xs leading-5 text-emerald-100">No API keys are saved in frontend state after this form submits, logged by the application, or added to the Git repository.</p>
            {configureProviderMutation.error ? <p className="mt-3 text-xs text-rose-300">The provider could not be saved. Check the local configuration and try again.</p> : null}
            <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSetupProvider(null)} className="border-white/10 bg-white/[0.03] text-slate-200">Cancel</Button><Button type="submit" disabled={!apiKey.trim() || configureProviderMutation.isPending} className="bg-sky-300 text-slate-950 hover:bg-sky-200">{configureProviderMutation.isPending ? "Securing…" : "Save securely"}</Button></div>
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
