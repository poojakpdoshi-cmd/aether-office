import { cn } from "@/lib/utils";

type OfficeEmployee = { name: string; shortName: string; role: string; status: string; accent: string };
type Props = { employees: OfficeEmployee[]; onOpenManager: () => void; onDeskFiles: () => void; onProviderLocker: () => void; onInspect: (target: string) => void };

const stations: Record<string, { x: string; y: string }> = {
  Manus: { x: "50%", y: "15%" }, Gemini: { x: "16%", y: "25%" }, DeepSeek: { x: "84%", y: "25%" }, Mistral: { x: "16%", y: "48%" }, Arcee: { x: "84%", y: "48%" }, SambaNova: { x: "16%", y: "72%" }, Grok: { x: "84%", y: "72%" },
};
const laptopPositions: Record<string, { left: string; top: string }> = {
  Manus: { left: "52%", top: "20%" }, Gemini: { left: "11%", top: "22%" }, DeepSeek: { left: "89%", top: "22%" }, Mistral: { left: "11%", top: "45%" }, Arcee: { left: "89%", top: "45%" }, SambaNova: { left: "11%", top: "69%" }, Grok: { left: "89%", top: "69%" },
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

export function LiveOffice({ employees, onOpenManager, onDeskFiles, onProviderLocker, onInspect }: Props) {
  return <section className="text-free-office" aria-label="Interactive animated AI office map">
    <div className="real-office-stage illustrated-office-stage" aria-label="Large interactive illustrated AI office map">
      <img className="real-office-backdrop" src="/manus-storage/owner-selected-office-floor_2f95057d.webp" alt="Owner-selected compact interactive office floor" />
      <div className="illustrated-readability" />
      <div className="deep-discuss-room-frame" aria-hidden="true"><i /><i /></div>
      <button onClick={onOpenManager} className="office-hotspot office-manager" aria-label="Open Manager Cabin" />
      <button onClick={onDeskFiles} className="manager-file-pile" aria-label="Provide files or photos to the Manager" />
      <button onClick={onProviderLocker} className="manager-provider-locker" aria-label="Open the secure Provider Locker" />
      <button onClick={() => onInspect("DeepDiscuss Room")} className="office-hotspot office-deep-discuss" aria-label="Open DeepDiscuss Room" />
      <button onClick={() => onInspect("Test Lab")} className="office-hotspot office-test" aria-label="Open Test Lab" /><button onClick={() => onInspect("Lounge")} className="office-hotspot map-lounge" aria-label="Open Lounge" />
      <button onClick={() => onInspect("Central Corridor")} className="office-corridor-zone" aria-label="Inspect Central Corridor" />
      {workZones.map((zone) => <button key={zone.label} onClick={() => onInspect(zone.label)} className="office-work-zone" style={{ left: zone.x, top: zone.y }} aria-label={`Inspect ${zone.label}`} />)}
      {employees.map((employee) => <button key={`${employee.name}-laptop`} onClick={() => onInspect(`${employee.name} Laptop`)} className="office-laptop-zone" style={laptopPositions[employee.name]} aria-label={`Inspect ${employee.name} laptop`} />)}
      {employees.map((employee) => { const pos = location(employee); return <button key={employee.name} onClick={() => employee.name === "Manus" ? onInspect("Manager") : onInspect(employee.name)} className={cn("illustrated-agent", `illustrated-${pos.state}`)} style={{ left: pos.x, top: pos.y }} aria-label={`${employee.name} is ${employee.status}`}>
        <img className="illustrated-agent-portrait" src={illustratedEmployees[employee.name] ?? illustratedEmployees.Mistral} alt="" /><span className="illustrated-agent-dot" />
      </button>; })}
    </div>
  </section>;
}
