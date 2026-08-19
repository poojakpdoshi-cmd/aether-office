import { cn } from "@/lib/utils";

type OfficeEmployee = { name: string; shortName: string; role: string; status: string; accent: string };
type Props = { employees: OfficeEmployee[]; activity?: string; onOpenManager: () => void; onInspect: (target: string) => void };

const stations: Record<string, { x: string; y: string }> = {
  Manus: { x: "15%", y: "46%" }, Gemini: { x: "38%", y: "44%" }, DeepSeek: { x: "77%", y: "41%" }, Mistral: { x: "25%", y: "74%" }, Arcee: { x: "54%", y: "75%" }, Grok: { x: "85%", y: "72%" },
};
const meetingPositions: Record<string, { x: string; y: string }> = { Manus: { x: "43%", y: "37%" }, Gemini: { x: "48%", y: "39%" }, DeepSeek: { x: "54%", y: "37%" }, Mistral: { x: "45%", y: "45%" }, Arcee: { x: "52%", y: "45%" }, Grok: { x: "58%", y: "42%" } };
const illustratedEmployees: Record<string, string> = {
  Manus: "/manus-storage/illustrated-manus_46107b3d.png", Gemini: "/manus-storage/illustrated-gemini_908df82a.png", DeepSeek: "/manus-storage/illustrated-deepseek_8bbe4ac7.png", Mistral: "/manus-storage/illustrated-mistral_e37410fe.png", Arcee: "/manus-storage/illustrated-arcee_e66515d0.png", Grok: "/manus-storage/illustrated-grok_1ba33ae9.png",
};
const workZones = [
  { label: "Manager Desk", x: "18%", y: "58%" }, { label: "Gemini Desk", x: "34%", y: "58%" }, { label: "DeepSeek Desk", x: "78%", y: "55%" }, { label: "Mistral Desk", x: "24%", y: "84%" }, { label: "Arcee Desk", x: "55%", y: "84%" }, { label: "Grok Desk", x: "86%", y: "82%" },
];
function location(employee: OfficeEmployee) {
  if (employee.status === "IN_MEETING") return { ...meetingPositions[employee.name], state: "meeting" };
  if (employee.status === "THINKING") return { ...stations[employee.name], state: "walking" };
  if (employee.status === "CODING") return { ...stations[employee.name], state: "coding" };
  if (employee.status === "REVIEWING") return { ...stations[employee.name], state: "reviewing" };
  if (employee.status === "TESTING") return { x: "70%", y: "58%", state: "testing" };
  if (employee.status === "WAITING") return { x: "10%", y: "78%", state: "waiting" };
  if (employee.status === "COMPLETED") return { x: "91%", y: "83%", state: "complete" };
  if (employee.status === "ERROR") return { x: "51%", y: "20%", state: "error" };
  return { ...stations[employee.name], state: "idle" };
}

export function LiveOffice({ employees, activity, onOpenManager, onInspect }: Props) {
  return <section className="real-office-shell illustrated-office-shell">
    <header className="real-office-head"><div><p>AEtherOffice · illustrated local workplace</p><h1>Manager Cabin</h1><span>Tap the cabin, a room, or an employee to see verified current work.</span></div><p className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Local office map</p></header>
    <div className="real-office-stage illustrated-office-stage" aria-label="Large interactive illustrated AI office map">
      <img className="real-office-backdrop" src="/manus-storage/aether-illustrated-office_8e766605.jpg" alt="Large hand-drawn modern software office" />
      <div className="illustrated-readability" /><div className="illustrated-office-sign">AETHER<br /><small>SOFTWARE STUDIO</small></div>
      <div className="deep-discuss-room-frame" aria-hidden="true"><span>PRIVATE DISCUSSION ROOM</span><i /><i /></div>
      <button onClick={onOpenManager} className="office-hotspot office-manager" aria-label="Open Manager Cabin"><b>MANAGER CABIN</b><span>Tap to enter</span></button>
      <button onClick={() => onInspect("DeepDiscuss Room")} className="office-hotspot office-deep-discuss" aria-label="Open DeepDiscuss Room"><b>DEEPDISCUSS ROOM</b><span>Private team discussion</span></button>
      <button onClick={() => onInspect("Test Lab")} className="office-hotspot office-test" aria-label="Open Test Lab"><b>TEST LAB</b></button><button onClick={() => onInspect("Lounge")} className="office-hotspot map-lounge" aria-label="Open Lounge"><b>LOUNGE</b></button>
      {workZones.map((zone) => <button key={zone.label} onClick={() => onInspect(zone.label)} className="office-work-zone" style={{ left: zone.x, top: zone.y }} aria-label={`Inspect ${zone.label}`}>{zone.label}</button>)}
      {employees.map((employee) => { const pos = location(employee); return <button key={employee.name} onClick={() => employee.name === "Manus" ? onInspect("Manager") : onInspect(employee.name)} className={cn("illustrated-agent", `illustrated-${pos.state}`)} style={{ left: pos.x, top: pos.y }} title={`${employee.name}: ${employee.status}`}>
        <img className="illustrated-agent-portrait" src={illustratedEmployees[employee.name]} alt="" /><span className="illustrated-agent-dot" /><span className="illustrated-agent-label"><b>{employee.name}</b><i>{employee.status}</i></span>{["coding", "reviewing", "testing"].includes(pos.state) ? <em>{pos.state === "testing" ? "✓" : pos.state === "reviewing" ? "⌕" : "⌨"}</em> : null}
      </button>; })}
    </div>
    <footer className="real-office-feed"><i />{activity || "Tap Manager Cabin to give your first command. A team discussion begins only after you issue a task."}</footer>
  </section>;
}
