export type CompactFloorPoint = { x: string; y: string };

export type CompactCabinSlot = {
  id: string;
  employee: string;
  station: CompactFloorPoint;
  room: { left: string; top: string; width: string; height: string };
  laptop: { left: string; top: string };
  desk: CompactFloorPoint;
};

export const COMPACT_CABIN_SLOTS: readonly CompactCabinSlot[] = [
  { id: "manager-cabin", employee: "Manus", station: { x: "50%", y: "14%" }, room: { left: "39%", top: "4%", width: "22%", height: "28%" }, laptop: { left: "52%", top: "20%" }, desk: { x: "50%", y: "17%" } },
  { id: "left-north-cabin", employee: "Gemini", station: { x: "11%", y: "21%" }, room: { left: "1%", top: "5%", width: "20%", height: "27%" }, laptop: { left: "10%", top: "20%" }, desk: { x: "12%", y: "24%" } },
  { id: "left-upper-cabin", employee: "DeepSeek", station: { x: "28%", y: "21%" }, room: { left: "20%", top: "5%", width: "18%", height: "27%" }, laptop: { left: "27%", top: "20%" }, desk: { x: "29%", y: "24%" } },
  { id: "right-upper-cabin", employee: "Mistral", station: { x: "72%", y: "21%" }, room: { left: "62%", top: "5%", width: "18%", height: "27%" }, laptop: { left: "71%", top: "20%" }, desk: { x: "73%", y: "24%" } },
  { id: "left-middle-cabin", employee: "SambaNova", station: { x: "10%", y: "47%" }, room: { left: "1%", top: "34%", width: "20%", height: "26%" }, laptop: { left: "10%", top: "46%" }, desk: { x: "12%", y: "50%" } },
  { id: "right-middle-cabin", employee: "Grok", station: { x: "90%", y: "47%" }, room: { left: "80%", top: "34%", width: "19%", height: "26%" }, laptop: { left: "89%", top: "46%" }, desk: { x: "91%", y: "50%" } },
  { id: "left-south-cabin", employee: "North Mini Code", station: { x: "10%", y: "73%" }, room: { left: "1%", top: "61%", width: "20%", height: "27%" }, laptop: { left: "10%", top: "72%" }, desk: { x: "12%", y: "76%" } },
  { id: "right-south-cabin", employee: "Devstral Small 2", station: { x: "90%", y: "73%" }, room: { left: "80%", top: "61%", width: "19%", height: "27%" }, laptop: { left: "89%", top: "72%" }, desk: { x: "91%", y: "76%" } },
  { id: "systems-cabin", employee: "Nemotron 3 Ultra", station: { x: "50%", y: "87%" }, room: { left: "38%", top: "78%", width: "24%", height: "19%" }, laptop: { left: "51%", top: "86%" }, desk: { x: "50%", y: "90%" } },
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
