import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";
import { allocateCompactCabinSlots, type CompactCabinSlot } from "./cabinSlots";
import { ACTIVE_OFFICE_BACKGROUND } from "./officeArtwork";

export type OfficeEmployee = { name: string; shortName: string; role: string; status: string; accent: string };
type Props = {
  employees: OfficeEmployee[];
  onOpenManager: () => void;
  onDeskFiles: () => void;
  onProviderLocker: () => void;
  onExitDoor: () => void;
  onOpenEmployeeRoom: (employee: string) => void;
  onInspectEmployeeComputer: (employee: string) => void;
  onInspect: (target: string) => void;
  showManagerCabin?: boolean;
  sideControl?: ReactNode;
  managementPanel?: ReactNode;
};

const meetingPositions: Record<string, { x: string; y: string }> = { Manus: { x: "43%", y: "50%" }, Gemini: { x: "49%", y: "48%" }, DeepSeek: { x: "55%", y: "50%" }, Mistral: { x: "43%", y: "56%" }, SambaNova: { x: "57%", y: "56%" }, Grok: { x: "57%", y: "48%" } };
const illustratedEmployees: Record<string, string> = {
  Manus: "/manus-storage/illustrated-manus_46107b3d.png", Gemini: "/manus-storage/illustrated-gemini_908df82a.png", DeepSeek: "/manus-storage/illustrated-deepseek_8bbe4ac7.png", Mistral: "/manus-storage/illustrated-mistral_e37410fe.png", Grok: "/manus-storage/illustrated-grok_1ba33ae9.png",
};
export function resolveOfficeLocation(employee: OfficeEmployee, slot: CompactCabinSlot) {
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

export function createAgentMotionFrames(deltaX: number, deltaY: number, mobileMotion: boolean) {
  const restingTransform = mobileMotion ? "translate3d(-50%, -50%, 0) scale(.82)" : "translate3d(-50%, -50%, 0)";
  return [
    { transform: `translate3d(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px), 0)${mobileMotion ? " scale(.82)" : ""}` },
    { transform: restingTransform },
  ];
}

export function buildOfficeHotspotPlan(employees: OfficeEmployee[]) {
  const { assignments } = allocateCompactCabinSlots(employees.map((employee) => employee.name));
  const assignedEmployeeNames = new Set(assignments.map((slot) => slot.employee));
  return {
    assignments,
    assignedEmployees: employees.filter((employee) => assignedEmployeeNames.has(employee.name)),
    hotspots: assignments.flatMap((slot) => [
      { employee: slot.employee, target: `${slot.employee} Desk` },
      { employee: slot.employee, target: `${slot.employee} Laptop` },
      { employee: slot.employee, target: `${slot.employee} Room` },
      { employee: slot.employee, target: slot.employee },
    ]),
  };
}

export function LiveOffice({ employees, onOpenManager, onDeskFiles, onProviderLocker, onExitDoor, onOpenEmployeeRoom, onInspectEmployeeComputer, onInspect, showManagerCabin = true, sideControl, managementPanel }: Props) {
  const { assignments, assignedEmployees } = buildOfficeHotspotPlan(employees);
  const slotByEmployee = new Map(assignments.map((slot) => [slot.employee, slot]));
  const agentNodes = useRef(new Map<string, HTMLButtonElement>());
  const previousAgentRects = useRef(new Map<string, DOMRect>());

  useEffect(() => {
    const nextAgentRects = new Map<string, DOMRect>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileMotion = window.matchMedia("(max-width: 760px)").matches;

    agentNodes.current.forEach((node, employee) => {
      const nextRect = node.getBoundingClientRect();
      const previousRect = previousAgentRects.current.get(employee);
      nextAgentRects.set(employee, nextRect);
      if (!previousRect || reducedMotion) return;

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      const motion = node.animate(createAgentMotionFrames(deltaX, deltaY, mobileMotion), {
        duration: 950,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        fill: "both",
      });
      motion.onfinish = () => motion.cancel();
    });

    previousAgentRects.current = nextAgentRects;
  }, [employees]);

  return <section className={sideControl ? "text-free-office office-with-control" : "text-free-office"} aria-label="Interactive animated AI office map">
    <div className="real-office-stage illustrated-office-stage" aria-label="Large interactive illustrated AI office map">
      <div className="office-ambient-backdrop" style={{ backgroundImage: `url(${ACTIVE_OFFICE_BACKGROUND})` }} aria-hidden="true" />
      <img className="real-office-backdrop" src={ACTIVE_OFFICE_BACKGROUND} alt="Owner-selected compact interactive office floor" />
      <div className="office-map-overlay">
        <div className="illustrated-readability" />
        <div className="deep-discuss-room-frame" aria-hidden="true"><i /><i /></div>
        {showManagerCabin ? <><button onClick={onOpenManager} className="office-hotspot office-manager" aria-label="Open Manager Cabin" />
          <button onClick={onDeskFiles} className="manager-file-pile" aria-label="Provide files or photos to the Manager" />
          <button onClick={onProviderLocker} className="manager-provider-locker" aria-label="Open the secure Provider Locker" /><button onClick={onExitDoor} className="office-exit-door-hotspot" aria-label="Open the office management panel" /></> : null}
        <button onClick={() => onInspect("DeepDiscuss Room")} className="office-hotspot office-deep-discuss" aria-label="Open DeepDiscuss Room" />
        <button onClick={() => onInspect("Test Lab")} className="office-hotspot office-test" aria-label="Open Test Lab" /><button onClick={() => onInspect("Lounge")} className="office-hotspot map-lounge" aria-label="Open Lounge" />
        <button onClick={() => onInspect("Central Corridor")} className="office-corridor-zone" aria-label="Inspect Central Corridor" />
        {assignments.filter((slot) => slot.employee !== "Manus").map((slot) => <button key={`${slot.id}-room`} onClick={() => onOpenEmployeeRoom(slot.employee)} className="office-room-zone" style={slot.room} aria-label={`Enter ${slot.employee}'s room`} />)}
        {assignments.map((slot) => <button key={`${slot.id}-desk`} onClick={() => onInspect(`${slot.employee} Desk`)} className="office-work-zone" style={{ left: slot.desk.x, top: slot.desk.y }} aria-label={`Inspect ${slot.employee} desk`} />)}
        {assignments.map((slot) => <button key={`${slot.id}-laptop`} onClick={() => onInspectEmployeeComputer(slot.employee)} className="office-laptop-zone" style={slot.laptop} aria-label={`Open ${slot.employee}'s computer live work`} />)}
        {assignedEmployees.map((employee) => { const slot = slotByEmployee.get(employee.name)!; const pos = resolveOfficeLocation(employee, slot); return <button key={employee.name} ref={(node) => { if (node) agentNodes.current.set(employee.name, node); else agentNodes.current.delete(employee.name); }} onClick={() => employee.name === "Manus" ? onInspect("Manager") : onInspect(employee.name)} className={cn("illustrated-agent", `illustrated-${pos.state}`)} style={{ left: pos.x, top: pos.y }} aria-label={`${employee.name} is ${employee.status}`}>
          <img className="illustrated-agent-portrait" src={illustratedEmployees[employee.name] ?? illustratedEmployees.Mistral} alt="" />{employee.name === "Manus" ? null : <span className="illustrated-agent-dot" />}
        </button>; })}
      </div>
    </div>
    {sideControl ?? managementPanel}
  </section>;
}
