import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Bot,
  ChevronRight,
  CircleDot,
  FileCode2,
  Files,
  FlaskConical,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  MessageSquareMore,
  PanelLeftClose,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UsersRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type WorkspaceView =
  | "Office"
  | "Chat"
  | "Files"
  | "Editor"
  | "Diff"
  | "Tests"
  | "Git"
  | "Employees"
  | "Settings";

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

const navigation = [
  { label: "Office" as const, icon: LayoutDashboard },
  { label: "Chat" as const, icon: MessageSquareMore },
  { label: "Files" as const, icon: Files },
  { label: "Editor" as const, icon: FileCode2 },
  { label: "Diff" as const, icon: GitBranch },
  { label: "Tests" as const, icon: FlaskConical },
  { label: "Git" as const, icon: FolderGit2 },
  { label: "Employees" as const, icon: UsersRound },
  { label: "Settings" as const, icon: Settings2 },
];

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
  const [activeView, setActiveView] = useState<WorkspaceView>("Office");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [task, setTask] = useState("");
  const [submittedTask, setSubmittedTask] = useState<string | null>(null);
  const [mode, setMode] = useState("Safe Mode");
  const [setupProvider, setSetupProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploadedAttachment, setUploadedAttachment] = useState<string | null>(null);
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
  const liveEmployees = employees.map((employee) => ({
    ...employee,
    status: (dashboard?.employees.find((profile) => profile.id === employee.name)?.status ?? employee.status) as EmployeeStatus,
  }));
  const startDeepDiscussMutation = trpc.aether.startDeepDiscuss.useMutation({ onSuccess: () => dashboardQuery.refetch() });
  const proposalActionMutation = trpc.aether.proposalAction.useMutation({ onSuccess: () => dashboardQuery.refetch() });
  const selectWorkspaceMutation = trpc.aether.selectWorkspace.useMutation({ onSuccess: () => workspaceQuery.refetch() });
  const directoryQuery = trpc.aether.listDirectory.useQuery({ path: "." }, { enabled: Boolean(workspaceQuery.data?.selected) });
  const fileQuery = trpc.aether.readFile.useQuery({ path: selectedFile ?? "." }, { enabled: Boolean(selectedFile) });
  const gitStatusQuery = trpc.aether.gitStatus.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.gitAvailable) });
  const gitDiffQuery = trpc.aether.gitDiff.useQuery(undefined, { enabled: Boolean(workspaceQuery.data?.gitAvailable) });
  const uploadMutation = trpc.aether.importUpload.useMutation({ onSuccess: (result) => { setUploadedAttachment(result.relativePath); directoryQuery.refetch(); } });
  const workspaceLabel = useMemo(() => workspaceQuery.data?.selected ? workspaceQuery.data.root?.split("/").pop() ?? "Selected workspace" : submittedTask ? "Task staged" : "No workspace selected", [submittedTask, workspaceQuery.data]);

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

  const startMeeting = () => {
    if (submittedTask) startDeepDiscussMutation.mutate({ task: submittedTask });
  };

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

  const renderOffice = () => (
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
              {startDeepDiscussMutation.error ? <p className="mt-3 text-xs text-rose-300">The meeting could not start. Configure a provider and review its endpoint/model settings.</p> : null}
              <Button size="sm" disabled={!configuredCount || startDeepDiscussMutation.isPending} onClick={startMeeting} className="mt-4 bg-sky-300 text-slate-950 hover:bg-sky-200">{startDeepDiscussMutation.isPending ? "Team is discussing…" : "Start DeepDiscuss"}</Button>
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
          {uploadedAttachment ? <p className="px-2 pb-1 pt-2 text-[11px] text-emerald-200">Attached to selected workspace: {uploadedAttachment}</p> : null}
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

  const renderEditor = () => selectedFile ? <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">{selectedFile}</p><p className="mt-1 text-xs text-slate-400">Read-only workspace inspection. AI edits require an approved plan and controlled tool call.</p></div><Button size="sm" variant="outline" onClick={() => setActiveView("Files")} className="border-white/10 bg-white/[0.03] text-slate-200">Back to files</Button></div><pre className="mt-5 max-h-[580px] overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{fileQuery.isLoading ? "Reading file…" : fileQuery.data?.content ?? "No file content available."}</pre></section> : <EmptyWorkspace title="No file open" detail="Choose a file from the selected workspace to inspect it. Controlled AI edits will be shown as owner-reviewable diffs." action="Open Files to select a file." />;

  const renderGit = () => <section className="rounded-2xl border border-white/10 bg-[#0d1527]/80 p-5">{!workspaceQuery.data?.gitAvailable ? <EmptyWorkspace title="Git workspace unavailable" detail="Select a directory that contains a Git repository to inspect branch status, diffs, history, and guarded commit actions." action="Automatic remote push is permanently disabled." /> : <><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Git workspace</p><p className="mt-1 text-xs text-slate-400">Read-only inspection is available now. Destructive actions require explicit owner confirmation.</p></div><Button size="sm" variant="outline" onClick={() => { gitStatusQuery.refetch(); gitDiffQuery.refetch(); }} className="border-white/10 bg-white/[0.03] text-slate-200">Refresh</Button></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</p><pre className="min-h-40 overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{gitStatusQuery.data || "Clean working tree."}</pre></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Diff</p><pre className="min-h-40 overflow-auto rounded-xl border border-white/[0.08] bg-black/25 p-4 text-xs leading-6 text-slate-300">{gitDiffQuery.data || "No uncommitted diff."}</pre></div></div></>}</section>;

  const renderView = () => {
    if (activeView === "Office") return renderOffice();
    if (activeView === "Chat") return renderChat();
    if (activeView === "Settings") return renderSettings();
    if (activeView === "Files") return renderFiles();
    if (activeView === "Editor") return renderEditor();
    if (activeView === "Git") return renderGit();
    const details: Record<Exclude<WorkspaceView, "Office" | "Chat" | "Settings">, [string, string, string]> = {
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
      <aside className={cn("aether-sidebar fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/[0.08] bg-[#090f1e]/95 px-3 py-4 backdrop-blur-xl transition-[width] duration-200", sidebarOpen ? "w-[248px]" : "w-[76px]")}>
        <div className="flex h-11 items-center gap-3 px-1.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-300 via-blue-400 to-violet-500 text-slate-950 shadow-lg shadow-blue-500/20"><Sparkles className="h-4 w-4" /></div>
          {sidebarOpen ? <div className="min-w-0"><p className="text-sm font-semibold tracking-[-0.02em] text-white">AetherOffice</p><p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sky-200/70">AI Software Company</p></div> : null}
        </div>
        <button onClick={() => setSidebarOpen((value) => !value)} className="mt-6 flex h-9 items-center gap-3 rounded-lg px-2 text-xs text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100" aria-label="Toggle navigation">
          <PanelLeftClose className={cn("h-4 w-4 shrink-0 transition-transform", !sidebarOpen && "rotate-180")} />
          {sidebarOpen ? <span>Collapse workspace</span> : null}
        </button>
        <ScrollArea className="mt-5 flex-1">
          <nav className="space-y-1 pr-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const selected = activeView === item.label;
              return <button key={item.label} onClick={() => setActiveView(item.label)} title={item.label} className={cn("group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors", selected ? "bg-sky-300/[0.11] text-sky-100 shadow-sm" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100")}><Icon className={cn("h-4 w-4 shrink-0", selected && "text-sky-300")} />{sidebarOpen ? <span>{item.label}</span> : null}{selected && sidebarOpen ? <ChevronRight className="ml-auto h-3.5 w-3.5 text-sky-300" /> : null}</button>;
            })}
          </nav>
        </ScrollArea>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <div className="flex items-center gap-2"><TerminalSquare className="h-4 w-4 text-emerald-300" />{sidebarOpen ? <span className="text-xs font-medium text-slate-200">Local engine</span> : null}</div>
          {sidebarOpen ? <p className="mt-1.5 text-[11px] leading-4 text-slate-500">Not connected · 127.0.0.1 only</p> : null}
        </div>
      </aside>

      <main className={cn("min-h-screen transition-[padding] duration-200", sidebarOpen ? "pl-[248px]" : "pl-[76px]")}>
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-4 border-b border-white/[0.07] bg-[#070b16]/85 px-5 py-3 backdrop-blur-xl sm:px-7">
          <div><p className="text-sm font-semibold text-white">{activeView}</p><p className="mt-0.5 text-xs text-slate-500">{activeView === "Office" ? "Company overview" : "Local workspace"}</p></div>
          <div className="flex items-center gap-2">
            <Badge className="hidden border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.04] sm:inline-flex"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-300" />No workspace</Badge>
            <Button size="sm" onClick={() => setActiveView("Settings")} className="bg-white text-slate-950 hover:bg-slate-200"><Settings2 className="mr-1.5 h-4 w-4" />Configure</Button>
          </div>
        </header>
        <div className="mx-auto max-w-[1680px] p-5 sm:p-7">{renderView()}</div>
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

function ProposalSection({ label, values }: { label: string; values: string[] }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><div className="mt-1.5 space-y-1 text-xs leading-5 text-slate-200">{values.map((value, index) => <p key={`${label}-${index}`}>{value}</p>)}</div></div>;
}
