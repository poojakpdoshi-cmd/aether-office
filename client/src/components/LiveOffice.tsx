import { cn } from "@/lib/utils";
import { allocateCompactCabinSlots, type CompactCabinSlot } from "./cabinSlots";

type OfficeEmployee = { name: string; shortName: string; role: string; status: string; accent: string };
type Props = { employees: OfficeEmployee[]; onOpenManager: () => void; onDeskFiles: () => void; onProviderLocker: () => void; onInspect: (target: string) => void };

const meetingPositions: Record<string, { x: string; y: string }> = { Manus: { x: "43%", y: "50%" }, Gemini: { x: "49%", y: "48%" }, DeepSeek: { x: "55%", y: "50%" }, Mistral: { x: "43%", y: "56%" }, Arcee: { x: "50%", y: "57%" }, SambaNova: { x: "57%", y: "56%" }, Grok: { x: "57%", y: "48%" } };
const illustratedEmployees: Record<string, string> = {
  Manus: "/manus-storage/illustrated-manus_46107b3d.png", Gemini: "/manus-storage/illustrated-gemini_908df82a.png", DeepSeek: "/manus-storage/illustrated-deepseek_8bbe4ac7.png", Mistral: "/manus-storage/illustrated-mistral_e37410fe.png", Arcee: "/manus-storage/illustrated-arcee_e66515d0.png", Grok: "/manus-storage/illustrated-grok_1ba33ae9.png",
};
function location(employee: OfficeEmployee, slot: CompactCabinSlot) {
  if (employee.status === "IN_MEETING") return { ...meetingPositions[employee.name], state: "meeting" };
  if (employee.status === "THINKING") return { ...slot.station, state: "walking" };
  if (employee.status === "CODING") return { ...slot.station, state: "coding" };
  if (employee.status === "REVIEWING") return { ...slot.station, state: "reviewing" };
  if (employee.status === "TESTING") return { x: "50%", y: "92%", state: "testing" };
  if (employee.status === "WAITING") return { x: "50%", y: "83%", state: "waiting" };
  if (employee.status === "COMPLETED") return { x: "50%", y: "94%", state: "complete" };
  if (employee.status === "ERROR") return { x: "50%", y: "39%", state: "error" };
  return { ...slot.station, state: "idle" };
}

export function LiveOffice({ employees, onOpenManager, onDeskFiles, onProviderLocker, onInspect }: Props) {
  const { assignments } = allocateCompactCabinSlots(employees.map((employee) => employee.name));
  const slotByEmployee = new Map(assignments.map((slot) => [slot.employee, slot]));
  const assignedEmployees = employees.filter((employee) => slotByEmployee.has(employee.name));
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
      {assignments.map((slot) => <button key={`${slot.id}-desk`} onClick={() => onInspect(`${slot.employee} Desk`)} className="office-work-zone" style={{ left: slot.desk.x, top: slot.desk.y }} aria-label={`Inspect ${slot.employee} desk`} />)}
      {assignments.map((slot) => <button key={`${slot.id}-laptop`} onClick={() => onInspect(`${slot.employee} Laptop`)} className="office-laptop-zone" style={slot.laptop} aria-label={`Inspect ${slot.employee} laptop`} />)}
      {assignedEmployees.map((employee) => { const slot = slotByEmployee.get(employee.name)!; const pos = location(employee, slot); return <button key={employee.name} onClick={() => employee.name === "Manus" ? onInspect("Manager") : onInspect(employee.name)} className={cn("illustrated-agent", `illustrated-${pos.state}`)} style={{ left: pos.x, top: pos.y }} aria-label={`${employee.name} is ${employee.status}`}>
        <img className="illustrated-agent-portrait" src={illustratedEmployees[employee.name] ?? illustratedEmployees.Mistral} alt="" /><span className="illustrated-agent-dot" />
      </button>; })}
    </div>
  </section>;
}
