import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, FileUp, KeyRound, Send, Settings2, UserPlus, UsersRound } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type { ApprovalMode, ProviderId } from "../../../shared/aether";

type Manager = { id: string; role: string; status: string; temporaryUntil?: number };
type Provider = { id: ProviderId; label: string; configured: boolean; availability: "ready" | "retired-gated" };

type Props = {
  managers: Manager[];
  providers: Provider[];
  approvalMode: ApprovalMode;
  taskPending: boolean;
  taskError?: string;
  provisionPending: boolean;
  onStartTask: (task: string) => void;
  onConfigureProvider: (label: string) => void;
  onProvision: (provider: ProviderId, count: number) => void;
  onSetApprovalMode: (mode: ApprovalMode) => void;
  onUpload: (file: File | undefined) => void;
  onOpenSettings: () => void;
  onOpenRoster: () => void;
};

export function OfficeControlChatbox({ managers, providers, approvalMode, taskPending, taskError, provisionPending, onStartTask, onConfigureProvider, onProvision, onSetApprovalMode, onUpload, onOpenSettings, onOpenRoster }: Props) {
  const [task, setTask] = useState("");
  const [provider, setProvider] = useState<ProviderId>(() => providers.find((item) => item.configured && item.id !== "manus")?.id ?? "gemini");
  const [count, setCount] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = task.trim();
    if (!trimmed) return;
    onStartTask(trimmed);
    setTask("");
  };
  const upload = (event: ChangeEvent<HTMLInputElement>) => onUpload(event.target.files?.[0]);

  return <aside className="office-control-chatbox" aria-label="AetherOffice control chatbox">
    <div className="office-control-heading"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">Aether control</p><h1 className="mt-1 text-lg font-semibold text-white">Orchestration desk</h1></div><Badge className="border-sky-300/20 bg-sky-300/[0.08] text-[10px] text-sky-100 hover:bg-sky-300/[0.08]">LOCAL</Badge></div>

    <section className="office-control-section"><div className="flex items-center justify-between gap-3"><p className="office-control-label">Manager orchestrators</p><Bot className="h-4 w-4 text-violet-200" /></div><div className="office-manager-roster mt-3">{managers.map((manager) => <div key={manager.id} className="office-manager-row"><span className="office-manager-avatar" aria-hidden="true">{manager.id.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-100">{manager.id}</p><p className="mt-0.5 truncate text-[10px] leading-4 text-slate-500">{manager.role}</p></div><span className={cn("rounded-full border px-2 py-1 text-[9px] font-semibold tracking-[0.08em]", manager.status === "ERROR" ? "border-rose-300/20 bg-rose-300/[0.06] text-rose-100" : "border-white/10 bg-white/[0.04] text-slate-300")}>{manager.status}</span></div>)}</div><p className="mt-3 text-[10px] leading-4 text-slate-500">Each role reports only a real runtime state. Manus remains temporary; Atlas coordinates delivery, and Nova coordinates quality review.</p></section>

    <form className="office-control-section" onSubmit={submitTask}><div className="flex items-center justify-between gap-3"><p className="office-control-label">Give the team a task</p><Send className="h-4 w-4 text-sky-200" /></div><textarea value={task} onChange={(event) => setTask(event.target.value)} placeholder="Tell the orchestrators what to build, change, or investigate…" className="office-task-input mt-3" rows={4} /><div className="mt-3 flex items-center justify-between gap-3"><label className="office-upload-trigger"><FileUp className="h-3.5 w-3.5" /><span>Add file</span><input type="file" className="sr-only" onChange={upload} /></label><Button type="submit" size="sm" disabled={!task.trim() || taskPending} className="bg-sky-300 text-slate-950 hover:bg-sky-200">{taskPending ? "Starting…" : "Start discussion"}</Button></div>{taskError ? <p className="mt-2 text-[10px] leading-4 text-rose-200">{taskError}</p> : null}</form>

    <section className="office-control-section"><div className="flex items-center justify-between gap-3"><p className="office-control-label">Employees</p><UserPlus className="h-4 w-4 text-emerald-200" /></div><p className="mt-2 text-[10px] leading-4 text-slate-500">Create one to five isolated employee profiles from an already configured provider.</p><div className="mt-3 grid grid-cols-[minmax(0,1fr)_72px] gap-2"><select aria-label="Employee provider" value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)} className="office-control-select">{providers.filter((item) => item.id !== "manus").map((item) => <option key={item.id} value={item.id} disabled={!item.configured || item.availability !== "ready"}>{item.label}{item.configured ? "" : " · not configured"}</option>)}</select><input aria-label="Employee count" className="office-control-select" type="number" min={1} max={5} value={count} onChange={(event) => setCount(Math.min(5, Math.max(1, Number(event.target.value) || 1)))} /></div><label className="mt-3 flex gap-2 text-[10px] leading-4 text-slate-400"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I confirm these are real provider-backed employees.</label><Button type="button" size="sm" disabled={!confirmed || provisionPending || !providers.find((item) => item.id === provider)?.configured} onClick={() => { onProvision(provider, count); setConfirmed(false); }} className="mt-3 w-full bg-emerald-300 text-slate-950 hover:bg-emerald-200">{provisionPending ? "Creating…" : "Create employees"}</Button></section>

    <section className="office-control-section"><div className="flex items-center justify-between gap-3"><p className="office-control-label">API keys & settings</p><KeyRound className="h-4 w-4 text-amber-200" /></div><div className="mt-3 grid gap-2">{providers.filter((item) => item.id !== "manus").map((item) => <button key={item.id} type="button" onClick={() => onConfigureProvider(item.label)} className="office-provider-row"><span>{item.label}</span><span className={item.configured ? "text-emerald-200" : item.availability === "retired-gated" ? "text-amber-200" : "text-slate-500"}>{item.configured ? "Configured" : item.availability === "retired-gated" ? "Review" : "Add key"}</span></button>)}</div><div className="mt-3 grid grid-cols-3 gap-1.5">{(["Safe Mode", "Team Mode", "Autonomous Mode"] as ApprovalMode[]).map((mode) => <button type="button" key={mode} onClick={() => onSetApprovalMode(mode)} className={cn("rounded-md border px-1.5 py-1.5 text-[9px] font-semibold", approvalMode === mode ? "border-sky-300/35 bg-sky-300/[0.1] text-sky-100" : "border-white/[0.08] bg-white/[0.025] text-slate-400")}>{mode.replace(" Mode", "")}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={onOpenSettings} className="border-white/10 bg-white/[0.03] text-slate-200"><Settings2 className="mr-1.5 h-3.5 w-3.5" />Settings</Button><Button type="button" size="sm" variant="outline" onClick={onOpenRoster} className="border-white/10 bg-white/[0.03] text-slate-200"><UsersRound className="mr-1.5 h-3.5 w-3.5" />Roster</Button></div></section>
  </aside>;
}
