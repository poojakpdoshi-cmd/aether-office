export type CompactFloorPoint = { x: string; y: string };

export type CompactCabinSlot = {
  id: string;
  employee: string;
  station: CompactFloorPoint;
  laptop: { left: string; top: string };
  desk: CompactFloorPoint;
};

export const COMPACT_CABIN_SLOTS: readonly CompactCabinSlot[] = [
  { id: "manager-cabin", employee: "Manus", station: { x: "50%", y: "15%" }, laptop: { left: "52%", top: "20%" }, desk: { x: "50%", y: "15%" } },
  { id: "left-north-cabin", employee: "Gemini", station: { x: "16%", y: "25%" }, laptop: { left: "11%", top: "22%" }, desk: { x: "16%", y: "31%" } },
  { id: "right-north-cabin", employee: "DeepSeek", station: { x: "84%", y: "25%" }, laptop: { left: "89%", top: "22%" }, desk: { x: "84%", y: "31%" } },
  { id: "left-middle-cabin", employee: "Mistral", station: { x: "16%", y: "48%" }, laptop: { left: "11%", top: "45%" }, desk: { x: "16%", y: "54%" } },
  { id: "right-middle-cabin", employee: "Arcee", station: { x: "84%", y: "48%" }, laptop: { left: "89%", top: "45%" }, desk: { x: "84%", y: "54%" } },
  { id: "left-south-cabin", employee: "SambaNova", station: { x: "16%", y: "72%" }, laptop: { left: "11%", top: "69%" }, desk: { x: "16%", y: "77%" } },
  { id: "right-south-cabin", employee: "Grok", station: { x: "84%", y: "72%" }, laptop: { left: "89%", top: "69%" }, desk: { x: "84%", y: "77%" } },
];

export function allocateCompactCabinSlots(employeeNames: readonly string[]) {
  const requested = Array.from(new Set(employeeNames));
  const assignments = COMPACT_CABIN_SLOTS.filter((slot) => requested.includes(slot.employee));
  const assignedNames = new Set(assignments.map((slot) => slot.employee));
  return {
    assignments,
    overflow: requested.filter((name) => !assignedNames.has(name)),
  };
}
