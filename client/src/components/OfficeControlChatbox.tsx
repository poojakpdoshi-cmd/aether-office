import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, FileUp, Send, Volume2 } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";

type Manager = { id: string; role: string; status: string; temporaryUntil?: number };
type ChatMessage = { role: "manager" | "owner"; content: string };
type MeetingPlan = { id: string; state: string; proposal: { objective: string; confidencePercent: number; risks: string[] } | null; guardianFindings?: string[] };

type Props = {
  managers: Manager[];
  messages: ChatMessage[];
  taskCandidate: string | null;
  chatPending: boolean;
  taskPending: boolean;
  meeting?: MeetingPlan;
  approvalPending: boolean;
  manusLifecycle: string;
  error?: string;
  onSendMessage: (message: string) => void;
  onStartProposedTask: () => void;
  onApprovePlan: () => void;
  onSpeak: (message: string) => void;
  onUpload: (file: File | undefined) => void;
};

export function OfficeControlChatbox({ managers, messages, taskCandidate, chatPending, taskPending, meeting, approvalPending, manusLifecycle, error, onSendMessage, onStartProposedTask, onApprovePlan, onSpeak, onUpload }: Props) {
  const [message, setMessage] = useState("");
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = message.trim();
    if (!clean) return;
    onSendMessage(clean);
    setMessage("");
  };
  const upload = (event: ChangeEvent<HTMLInputElement>) => onUpload(event.target.files?.[0]);
  const latestManager = [...messages].reverse().find((entry) => entry.role === "manager");

  return <aside className="office-control-chatbox office-manager-chat" aria-label="AetherOffice manager chat">
    <div className="office-control-heading"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">Aether manager</p><h1 className="mt-1 text-lg font-semibold text-white">Talk to the office</h1></div><Badge className="border-sky-300/20 bg-sky-300/[0.08] text-[10px] text-sky-100 hover:bg-sky-300/[0.08]">VOICE READY</Badge></div>
    <section className="office-control-section"><div className="flex items-center justify-between gap-3"><p className="office-control-label">Primary manager</p><Bot className="h-4 w-4 text-violet-200" /></div><div className="office-manager-roster mt-3">{managers.map((manager, index) => <div key={manager.id} className={cn("office-manager-row", index === 0 && "office-manager-primary")}><span className="office-manager-avatar" aria-hidden="true">{manager.id.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-100">{manager.id}{index === 0 ? " · Fast lead" : ""}</p><p className="mt-0.5 truncate text-[10px] leading-4 text-slate-500">{manager.role}</p></div><span className={cn("rounded-full border px-2 py-1 text-[9px] font-semibold tracking-[0.08em]", manager.status === "ERROR" ? "border-rose-300/20 bg-rose-300/[0.06] text-rose-100" : "border-white/10 bg-white/[0.04] text-slate-300")}>{manager.status}</span></div>)}</div><p className="mt-3 border-t border-[#9db0a0] pt-3 text-[10px] leading-4 text-slate-600">{manusLifecycle}</p></section>
    <section className="office-control-section office-chat-history" aria-live="polite"><div className="flex items-center justify-between gap-3"><p className="office-control-label">Conversation</p>{latestManager ? <button type="button" aria-label="Speak the latest manager reply" onClick={() => onSpeak(latestManager.content)} className="office-voice-button"><Volume2 className="h-3.5 w-3.5" />Speak</button> : null}</div><div className="mt-3 space-y-2">{messages.map((entry, index) => <div key={`${entry.role}-${index}-${entry.content.slice(0, 20)}`} className={cn("office-chat-bubble", entry.role === "manager" ? "office-chat-manager" : "office-chat-owner")}><span>{entry.role === "manager" ? "Manager" : "You"}</span><p>{entry.content}</p></div>)}</div></section>
    {taskCandidate ? <section className="office-control-section office-proposed-task"><p className="office-control-label">Manager meeting ready</p><p className="mt-2 text-xs leading-5 text-slate-700">{taskCandidate}</p><p className="mt-2 text-[10px] leading-4 text-slate-500">The manager will share this conclusion with every configured available employee for research, then return one plan. No real work starts yet.</p><Button type="button" size="sm" disabled={taskPending} onClick={onStartProposedTask} className="mt-3 w-full bg-sky-300 text-slate-950 hover:bg-sky-200">{taskPending ? "Research meeting running…" : "Start manager meeting & research"}</Button></section> : null}
    {meeting?.proposal ? <section className="office-control-section office-research-plan"><p className="office-control-label">Team research complete</p><p className="mt-2 text-xs font-semibold leading-5 text-slate-800">{meeting.proposal.objective}</p><p className="mt-2 text-[10px] leading-4 text-slate-600">Manager plan confidence: {meeting.proposal.confidencePercent}%</p>{meeting.guardianFindings?.length ? <div className="mt-3 border-t border-[#9db0a0] pt-3"><p className="office-control-label">Guardian review</p>{meeting.guardianFindings.map((finding, index) => <p className="mt-1 text-[10px] leading-4 text-slate-600" key={`${finding}-${index}`}>{finding}</p>)}</div> : null}{meeting.state === "PENDING_APPROVAL" ? <><p className="mt-3 text-[10px] leading-4 text-slate-500">Approve the plan before any controlled workspace or sandbox work can begin.</p><Button type="button" size="sm" disabled={approvalPending} onClick={onApprovePlan} className="mt-3 w-full bg-emerald-300 text-slate-950 hover:bg-emerald-200">{approvalPending ? "Recording approval…" : "Approve plan & allow work"}</Button></> : <p className="mt-3 text-[10px] font-semibold text-[#496f58]">Owner plan state: {meeting.state.replaceAll("_", " ")}</p>}</section> : null}
    <form className="office-control-section" onSubmit={send}><div className="flex items-center justify-between gap-3"><p className="office-control-label">Message the manager</p><Send className="h-4 w-4 text-sky-200" /></div><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Say hello, ask a question, or describe a task…" className="office-task-input mt-3" rows={3} /><div className="mt-3 flex items-center justify-between gap-3"><label className="office-upload-trigger"><FileUp className="h-3.5 w-3.5" /><span>Add file</span><input type="file" className="sr-only" onChange={upload} /></label><Button type="submit" size="sm" disabled={!message.trim() || chatPending} className="bg-sky-300 text-slate-950 hover:bg-sky-200">{chatPending ? "Manager is replying…" : "Send"}</Button></div>{error ? <p className="mt-2 text-[10px] leading-4 text-rose-700">{error}</p> : null}</form>
    <p className="px-1 pt-3 text-[10px] leading-4 text-slate-500">Tap an empty part of the office floor to open the lower management page for employees, API keys, and settings.</p>
  </aside>;
}
