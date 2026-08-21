import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, Monitor, Power, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

type Employee = { name: string; role: string; status: string; shortName: string };
type RoomSnapshot = {
  room: { id: string; workspaceLabel: string };
  sandbox: { id: string; status: "stopped" | "building" | "running" | "runtime-unavailable" | "error"; containerName: string; volumeName: string; workspacePath: string; detail?: string };
  processes: Array<{ id: string; command: string; args: string[]; status: "running" | "completed" | "failed" | "cancelled"; startedAt: number; completedAt: number | null; exitCode: number | null; stdout: string; stderr: string }>;
};

export function EmployeeRoomScene({ employee, onOpenComputer }: { employee: Employee; onOpenComputer: () => void }) {
  return <section className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-[#162127] shadow-2xl shadow-black/25">
    <div className="flex items-center justify-between border-b border-white/10 bg-[#0d151a] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300"><span>{employee.name}&apos;s personal room</span><span className="text-emerald-300">Live status · {employee.status}</span></div>
    <div className="relative min-h-[330px] overflow-hidden bg-[linear-gradient(135deg,#26353a_0%,#1d292f_55%,#172126_100%)] p-5 sm:min-h-[390px]">
      <div className="absolute inset-x-7 top-6 h-20 rounded border border-sky-100/20 bg-[linear-gradient(180deg,#a7d9e7_0%,#6d9eb4_100%)] shadow-inner shadow-white/25"><div className="absolute inset-3 rounded border border-white/25 bg-white/10" /></div>
      <div className="absolute bottom-0 left-0 right-0 h-[42%] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.025)_0_2px,transparent_2px_80px),linear-gradient(180deg,#34434a_0%,#202c31_100%)]" />
      <div className="relative mx-auto mt-20 w-full max-w-xl">
        <div className="absolute left-[12%] top-[24%] h-28 w-8 rounded-full bg-[#182126] shadow-[0_0_0_5px_rgba(0,0,0,.13)]" />
        <div className="absolute left-[16%] top-[8%] h-16 w-16 rounded-full border-4 border-[#1d2830] bg-[radial-gradient(circle_at_40%_38%,#deb496_0_30%,#8b5e50_32%_100%)]" />
        <div className="absolute left-[9%] top-[1%] h-12 w-20 rounded-[50%_55%_45%_40%] bg-[#172027]" />
        <div className="absolute left-[11%] top-[29%] h-20 w-20 rounded-t-[48%] bg-[linear-gradient(135deg,#5f87a4,#344f65)]" />
        <div className="absolute left-[28%] top-[40%] h-4 w-28 origin-left rotate-[-8deg] rounded-full bg-[#dcae91]" />
        <div className="absolute left-[45%] top-[48%] h-3 w-20 origin-left rotate-[8deg] rounded-full bg-[#dcae91]" />
        <div className="relative ml-[29%] mt-16 h-40 rounded-t-xl border-x border-t border-[#101719] bg-[linear-gradient(180deg,#73513c_0%,#432e26_100%)] shadow-[0_-10px_0_rgba(0,0,0,.13)]">
          <div className="absolute left-[21%] top-[-55px] h-14 w-28 rounded border-[6px] border-[#11191d] bg-[#0b1619] shadow-xl"><div className="m-1.5 h-full rounded-sm bg-[linear-gradient(135deg,#244b53,#0f252b)]"><span className="ml-2 pt-2 block font-mono text-[8px] text-emerald-200">{employee.status === "IDLE" ? "awaiting approved task" : "verified activity"}</span></div></div>
          <div className="absolute left-[31%] top-[-4px] h-5 w-12 rounded-b bg-[#131b1e]" />
          <div className="absolute right-6 top-6 h-10 w-10 rounded bg-[#e5d4a6]/20" />
          <div className="absolute bottom-3 left-7 right-7 h-5 rounded bg-[#201713]/50" />
        </div>
        <button type="button" onClick={onOpenComputer} className="group absolute left-[42%] top-[36%] h-[96px] w-[140px] rounded-md border-2 border-emerald-300/65 bg-transparent outline-none ring-offset-2 ring-offset-[#26353a] transition hover:border-emerald-200 hover:bg-emerald-300/10 focus-visible:ring-2 focus-visible:ring-emerald-200" aria-label={`Open ${employee.name}'s real computer monitor`}><span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-emerald-100 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Open real computer monitor</span></button>
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200"><span className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-emerald-300" />{employee.status === "IDLE" ? "Employee is waiting for an approved task." : `Current verified state: ${employee.status}.`}</span><button type="button" onClick={onOpenComputer} className="font-semibold text-emerald-200 underline underline-offset-4">Tap the computer to inspect</button></div>
    </div>
  </section>;
}

export function EmployeeComputerMonitor({ employee }: { employee: string }) {
  const [destroyConfirmed, setDestroyConfirmed] = useState(false);
  const roomQuery = trpc.aether.employeeRoom.useQuery({ employee }, { refetchInterval: 1_000 });
  const startMutation = trpc.aether.startEmployeeSandbox.useMutation({ onSuccess: () => roomQuery.refetch() });
  const stopMutation = trpc.aether.stopEmployeeSandbox.useMutation({ onSuccess: () => roomQuery.refetch() });
  const restartMutation = trpc.aether.restartEmployeeSandbox.useMutation({ onSuccess: () => roomQuery.refetch() });
  const destroyMutation = trpc.aether.destroyEmployeeSandbox.useMutation({ onSuccess: () => { setDestroyConfirmed(false); roomQuery.refetch(); } });
  const room = roomQuery.data as RoomSnapshot | undefined;
  const sandbox = room?.sandbox;
  const latestProcess = room?.processes[0];
  const busy = startMutation.isPending || stopMutation.isPending || restartMutation.isPending || destroyMutation.isPending;
  const terminalText = latestProcess ? (latestProcess.stdout || latestProcess.stderr || (latestProcess.status === "running" ? "Process is running; output will appear only when the isolated process writes it." : "This isolated process completed without captured output.")) : sandbox?.status === "runtime-unavailable" ? "A Docker Desktop or Podman runtime is required. No host terminal fallback is permitted." : "No real sandbox process has run for this employee yet.";

  return <section className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-[#11191f] shadow-2xl shadow-black/30"><div className="flex items-center justify-between border-b border-white/10 bg-[#1b252c] px-4 py-2"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="ml-2 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-300">{employee}&apos;s computer · isolated monitor</span></div><Badge className={sandbox?.status === "running" ? "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-100" : "border-white/10 bg-white/[.05] text-slate-200"}>{sandbox?.status ?? "checking"}</Badge></div><div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_230px]"><div className="min-h-[320px] bg-[#070c10] p-4 font-mono text-xs leading-6 text-slate-300"><p className="text-emerald-300">{employee.toLowerCase().replace(/\s+/g, "-")}@aether-office:{sandbox?.workspacePath ?? "/workspace"}$</p>{latestProcess ? <p className="text-slate-100">$ {latestProcess.command} {latestProcess.args.join(" ")}</p> : null}<pre aria-live="polite" className="mt-3 max-h-[280px] overflow-auto whitespace-pre-wrap text-[11px] leading-6 text-slate-300">{terminalText}</pre><p className="mt-4 text-slate-500">Only actual container process data is rendered here. There is no simulated shell session.</p></div><aside className="border-t border-white/10 bg-[#162128] p-4 lg:border-l lg:border-t-0"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-sky-200">Sandbox controls</p><p className="mt-2 text-xs leading-5 text-slate-400">Container: {sandbox?.containerName ?? "Not allocated"}<br />Network: disabled by default<br />Workspace: {sandbox?.workspacePath ?? "Unavailable"}</p>{sandbox?.detail ? <p className="mt-3 rounded border border-amber-300/15 bg-amber-300/[.05] p-2 text-[10px] leading-4 text-amber-100">{sandbox.detail}</p> : null}<div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" disabled={busy} onClick={() => startMutation.mutate({ employee })} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200"><Power className="mr-1 h-3.5 w-3.5" />Start</Button><Button size="sm" variant="outline" disabled={busy || sandbox?.status !== "running"} onClick={() => stopMutation.mutate({ employee, ownerConfirmed: true })} className="border-white/10 bg-white/[.03] text-slate-200">Stop</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => restartMutation.mutate({ employee, ownerConfirmed: true })} className="col-span-2 border-white/10 bg-white/[.03] text-slate-200"><RotateCcw className="mr-1 h-3.5 w-3.5" />Restart sandbox</Button></div><label className="mt-4 flex items-start gap-2 text-[10px] leading-4 text-rose-200"><input type="checkbox" checked={destroyConfirmed} onChange={(event) => setDestroyConfirmed(event.target.checked)} />I understand this removes this employee&apos;s persistent workspace.</label><Button size="sm" variant="outline" disabled={busy || !destroyConfirmed} onClick={() => destroyMutation.mutate({ employee, ownerConfirmed: true })} className="mt-2 w-full border-rose-300/25 bg-rose-300/[.04] text-rose-200"><Trash2 className="mr-1 h-3.5 w-3.5" />Destroy sandbox</Button><p className="mt-4 flex gap-2 text-[10px] leading-4 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-200" />No command runs directly on the host.</p></aside></div>{roomQuery.error || startMutation.error || stopMutation.error || restartMutation.error || destroyMutation.error ? <p className="border-t border-rose-300/15 bg-rose-300/[.05] px-4 py-2 text-xs text-rose-200">{roomQuery.error?.message ?? startMutation.error?.message ?? stopMutation.error?.message ?? restartMutation.error?.message ?? destroyMutation.error?.message}</p> : null}</section>;
}
