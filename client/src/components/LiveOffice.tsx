import { cn } from "@/lib/utils";

type OfficeEmployee = { name: string; shortName: string; role: string; status: string; accent: string };
type Props = { employees: OfficeEmployee[]; activity?: string; onOpenManager: () => void; onDeskFiles: () => void; onProviderLocker: () => void; onInspect: (target: string) => void };

const stations: Record<string, { x: string; y: string }> = {
  Manus: { x: "50%", y: "15%" }, Gemini: { x: "16%", y: "25%" }, DeepSeek: { x: "84%", y: "25%" }, Mistral: { x: "16%", y: "48%" }, Arcee: { x: "84%", y: "48%" }, SambaNova: { x: "16%", y: "72%" }, Grok: { x: "84%", y: "72%" },
};
const meetingPositions: Record<string, { x: string; y: string }> = { Manus: { x: "43%", y: "50%" }, Gemini: { x: "49%", y: "48%" }, DeepSeek: { x: "55%", y: "50%" }, Mistral: { x: "43%", y: "56%" }, Arcee: { x: "50%", y: "57%" }, SambaNova: { x: "57%", y: "56%" }, Grok: { x: "57%", y: "48%" } };
const illustratedEmployees: Record<string, string> = {
  Manus: "/manus-storage/illustrated-manus_46107b3d.png", Gemini: "/manus-storage/illustrated-gemini_908df82a.png", DeepSeek: "/manus-storage/illustrated-deepseek_8bbe4ac7.png", Mistral: "/manus-storage/illustrated-mistral_e37410fe.png", Arcee: "/manus-storage/illustrated-arcee_e66515d0.png", Grok: "/manus-storage/illustrated-grok_1ba33ae9.png",
};
const workZones = [
  { label: "Manager Desk", x: "50%", y: "15%" }, { label: "Gemini Desk", x: "16%", y: "31%" }, { label: "DeepSeek Desk", x: "84%", y: "31%" }, { label: "Mistral Desk", x: "16%", y: "54%" }, { label: "Arcee Desk", x: "84%", y: "54%" }, { label: "SambaNova Desk", x: "16%", y: "77%" }, { label: "Grok Desk", x: "84%", y: "77%" },
];
function location(employee: OfficeEmployee) {
  if (employee.status === "IN_MEETING") return { ...meetingPositions[employee.name], state: "meeting" };
  if (employee.status === "THINKING") return { ...stations[employee.name], state: "walking" };
  if (employee.status === "CODING") return { ...stations[employee.name], state: "coding" };
  if (employee.status === "REVIEWING") return { ...stations[employee.name], state: "reviewing" };
  if (employee.status === "TESTING") return { x: "50%", y: "92%", state: "testing" };
  if (employee.status === "WAITING") return { x: "50%", y: "83%", state: "waiting" };
  if (employee.status === "COMPLETED") return { x: "50%", y: "94%", state: "complete" };
  if (employee.status === "ERROR") return { x: "50%", y: "39%", state: "error" };
  return { ...stations[employee.name], state: "idle" };
}

export function LiveOffice({ employees, activity, onOpenManager, onDeskFiles, onProviderLocker, onInspect }: Props) {
  return <section className="real-office-shell illustrated-office-shell">
    <header className="real-office-head"><div><p>AEtherOffice · illustrated local workplace</p><h1>Manager Cabin</h1><span>Tap the cabin, a room, or an employee to see verified current work.</span></div><p className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Local office map</p></header>
    <div className="real-office-stage illustrated-office-stage" aria-label="Large interactive illustrated AI office map">
      <img className="real-office-backdrop" src="/manus-storage/owner-selected-office-floor_2f95057d.webp" alt="Owner-selected compact interactive office floor" />
      <div className="illustrated-readability" /><div className="illustrated-office-sign">AETHER<br /><small>SOFTWARE STUDIO</small></div>
      <div className="deep-discuss-room-frame" aria-hidden="true"><span>PRIVATE DISCUSSION ROOM</span><i /><i /></div>
      <button onClick={onOpenManager} className="office-hotspot office-manager" aria-label="Open Manager Cabin"><b>MANAGER CABIN</b><span>Tap to enter</span></button>
      <button onClick={onDeskFiles} className="manager-file-pile" aria-label="Provide files or photos to the Manager"><span>FILES</span><span>PHOTOS</span></button>
      <button onClick={onProviderLocker} className="manager-provider-locker" aria-label="Open the secure Provider Locker"><span>🔐</span><i>LOCAL</i></button>
      <button onClick={() => onInspect("DeepDiscuss Room")} className="office-hotspot office-deep-discuss" aria-label="Open DeepDiscuss Room"><b>DEEPDISCUSS ROOM</b><span>Private team discussion</span></button>
      <button onClick={() => onInspect("Test Lab")} className="office-hotspot office-test" aria-label="Open Test Lab"><b>TEST LAB</b></button><button onClick={() => onInspect("Lounge")} className="office-hotspot map-lounge" aria-label="Open Lounge"><b>WAITING AREA</b></button>
      {workZones.map((zone) => <button key={zone.label} onClick={() => onInspect(zone.label)} className="office-work-zone" style={{ left: zone.x, top: zone.y }} aria-label={`Inspect ${zone.label}`}>{zone.label}</button>)}
      {employees.map((employee) => { const pos = location(employee); return <button key={employee.name} onClick={() => employee.name === "Manus" ? onInspect("Manager") : onInspect(employee.name)} className={cn("illustrated-agent", `illustrated-${pos.state}`)} style={{ left: pos.x, top: pos.y }} title={`${employee.name}: ${employee.status}`}>
        <img className="illustrated-agent-portrait" src={illustratedEmployees[employee.name] ?? illustratedEmployees.Mistral} alt="" /><span className="illustrated-agent-dot" /><span className="illustrated-agent-label"><b>{employee.name}</b><i>{employee.status}</i></span>{["coding", "reviewing", "testing"].includes(pos.state) ? <em>{pos.state === "testing" ? "✓" : pos.state === "reviewing" ? "⌕" : "⌨"}</em> : null}
      </button>; })}
    </div>
    <footer className="real-office-feed"><i />{activity || "Tap Manager Cabin to give your first command. A team discussion begins only after you issue a task."}</footer>
  </section>;
}
