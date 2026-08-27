import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { allocateCompactCabinSlots, type CompactCabinSlot } from "./cabinSlots";
import { OFFICE_ANIMATION_STYLES, type OfficeAnimationStyle } from "./officeArtwork";
import { EMPTY_FLOOR_HOTSPOT } from "./officeHotspots";

export type OfficeEmployee = { name: string; shortName: string; role: string; status: string; accent: string };
type Props = {
  employees: OfficeEmployee[];
  onOpenManager?: () => void;
  onDeskFiles?: () => void;
  onProviderLocker?: () => void;
  onExitDoor?: () => void;
  onOpenEmployeeRoom: (employee: string) => void;
  onInspectEmployeeComputer: (employee: string) => void;
  onInspect: (target: string) => void;
  onOpenEmptyFloor?: () => void;
  showManagerCabin?: boolean;
  sideControl?: ReactNode;
  managementPanel?: ReactNode;
  animationStyle?: OfficeAnimationStyle;
  onAnimationStyleChange?: (style: OfficeAnimationStyle) => void;
};

const meetingPositions: Record<string, { x: string; y: string }> = { Manus: { x: "43%", y: "50%" }, Gemini: { x: "49%", y: "48%" }, DeepSeek: { x: "55%", y: "50%" }, Mistral: { x: "43%", y: "56%" }, SambaNova: { x: "57%", y: "56%" }, Grok: { x: "57%", y: "48%" } };
const corridorWalkerAssets = [
  "/manus-storage/aether-office-walking-employee-final_4d75bef9.png",
];

function corridorWalkerAsset(employee: OfficeEmployee) {
  return corridorWalkerAssets[employee.name.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % corridorWalkerAssets.length]!;
}

export function resolveOfficeLocation(employee: OfficeEmployee, slot: CompactCabinSlot) {
  if (employee.status === "IN_MEETING") return { ...meetingPositions[employee.name], state: "meeting" };
  if (employee.status === "THINKING") {
    const stationX = Number.parseFloat(slot.station.x);
    const stationY = Number.parseFloat(slot.station.y);
    const corridor = stationX < 40
      ? { x: "33%", y: slot.station.y }
      : stationX > 60
        ? { x: "67%", y: slot.station.y }
        : { x: "50%", y: stationY < 50 ? "31%" : "75%" };
    return { ...corridor, state: "walking" };
  }
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
  const horizontalFirst = Math.abs(deltaX) >= Math.abs(deltaY);
  const corridorTransform = horizontalFirst
    ? `translate3d(0, calc(-50% + ${deltaY}px), 0)${mobileMotion ? " scale(.82)" : ""}`
    : `translate3d(calc(-50% + ${deltaX}px), 0, 0)${mobileMotion ? " scale(.82)" : ""}`;
  return [
    { transform: `translate3d(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px), 0)${mobileMotion ? " scale(.82)" : ""}`, offset: 0 },
    { transform: corridorTransform, offset: .58 },
    { transform: restingTransform, offset: 1 },
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

export function LiveOffice({ employees, onOpenEmployeeRoom, onInspectEmployeeComputer, onInspect, onOpenEmptyFloor, sideControl, managementPanel, animationStyle = "metro", onAnimationStyleChange }: Props) {
  const { assignments, assignedEmployees } = buildOfficeHotspotPlan(employees);
  const officeArtwork = OFFICE_ANIMATION_STYLES[animationStyle];
  const slotByEmployee = new Map(assignments.map((slot) => [slot.employee, slot]));
  const agentNodes = useRef(new Map<string, HTMLButtonElement>());
  const previousAgentRects = useRef(new Map<string, DOMRect>());
  const [postAnimationReady, setPostAnimationReady] = useState(!sideControl);

  useEffect(() => {
    if (!sideControl) { setPostAnimationReady(true); return; }
    setPostAnimationReady(false);
    const timer = window.setTimeout(() => setPostAnimationReady(true), 620);
    return () => window.clearTimeout(timer);
  }, [Boolean(sideControl)]);

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
        duration: Math.min(1450, 620 + Math.hypot(deltaX, deltaY) * 2.1),
        easing: "linear",
        fill: "both",
      });
      motion.onfinish = () => motion.cancel();
    });

    previousAgentRects.current = nextAgentRects;
  }, [employees]);

  return <section className={cn(sideControl ? "text-free-office office-with-control" : "text-free-office", `office-animation-${animationStyle}`)} aria-label="Interactive animated AI office map">
    <div className="real-office-stage illustrated-office-stage" aria-label="Large interactive illustrated AI office map">
      <div className="office-ambient-backdrop" style={{ backgroundImage: `url(${officeArtwork.image})` }} aria-hidden="true" />
      <img className="real-office-backdrop" src={officeArtwork.image} alt={`${officeArtwork.label} interactive office floor`} />
      {onAnimationStyleChange ? <div className="office-animation-picker"><label htmlFor="office-animation-style">Set your animation</label><select id="office-animation-style" value={animationStyle} onChange={(event) => onAnimationStyleChange(event.target.value as OfficeAnimationStyle)} aria-label="Set your animation">{Object.entries(OFFICE_ANIMATION_STYLES).map(([style, option]) => <option key={style} value={style}>{option.label}</option>)}</select></div> : null}
      <div className="office-map-overlay">
        <div className="illustrated-readability" />
        <div className="deep-discuss-room-frame" aria-hidden="true"><i /><i /></div>
        <button onClick={() => onInspect("DeepDiscuss Room")} className="office-hotspot office-deep-discuss" aria-label="Open DeepDiscuss Room" />
        <button onClick={() => onInspect("Test Lab")} className="office-hotspot office-test" aria-label="Open Test Lab" /><button onClick={() => onInspect("Lounge")} className="office-hotspot map-lounge" aria-label="Open Lounge" />
        <button onClick={() => onInspect("Central Corridor")} className="office-corridor-zone" aria-label="Inspect Central Corridor" />
        {onOpenEmptyFloor ? <button onClick={onOpenEmptyFloor} className="office-empty-floor-zone" style={EMPTY_FLOOR_HOTSPOT} aria-label="Open the lower office management page" /> : null}
        {assignments.filter((slot) => slot.employee !== "Manus").map((slot) => <button key={`${slot.id}-room`} onClick={() => onOpenEmployeeRoom(slot.employee)} className="office-room-zone" style={slot.room} aria-label={`Enter ${slot.employee}'s room`} />)}
        {assignments.map((slot) => <button key={`${slot.id}-desk`} onClick={() => onInspect(`${slot.employee} Desk`)} className="office-work-zone" style={{ left: slot.desk.x, top: slot.desk.y }} aria-label={`Inspect ${slot.employee} desk`} />)}
        {assignments.map((slot) => <button key={`${slot.id}-laptop`} onClick={() => onInspectEmployeeComputer(slot.employee)} className="office-laptop-zone" style={slot.laptop} aria-label={`Open ${slot.employee}'s computer live work`} />)}
        {assignedEmployees.map((employee) => { const slot = slotByEmployee.get(employee.name)!; const pos = resolveOfficeLocation(employee, slot); return <button key={employee.name} ref={(node) => { if (node) agentNodes.current.set(employee.name, node); else agentNodes.current.delete(employee.name); }} onClick={() => employee.name === "Manus" ? onInspect("Manager") : onInspect(employee.name)} className={cn("illustrated-agent", `illustrated-${pos.state}`)} style={{ left: pos.x, top: pos.y }} aria-label={`${employee.name} is ${employee.status}`} data-motion-state={pos.state}>{pos.state === "walking" ? <img className="office-corridor-walker" src={corridorWalkerAsset(employee)} alt="" aria-hidden="true" /> : null}</button>; })}
      </div>
    </div>
    {sideControl && postAnimationReady ? <div className="office-post-animation-control">{sideControl}</div> : managementPanel}
  </section>;
}
