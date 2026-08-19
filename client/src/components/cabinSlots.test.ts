import { describe, expect, it } from "vitest";
import { COMPACT_CABIN_SLOTS, allocateCompactCabinSlots } from "./cabinSlots";

describe("compact floor cabin allocation", () => {
  it("assigns only configured known employees to their dedicated available cabin slots", () => {
    const { assignments, overflow } = allocateCompactCabinSlots(["Manus", "Gemini", "Grok"]);
    expect(assignments.map((slot) => slot.employee)).toEqual(["Manus", "Gemini", "Grok"]);
    expect(overflow).toEqual([]);
  });

  it("keeps unknown or overflowing employee names off the office floor", () => {
    const { assignments, overflow } = allocateCompactCabinSlots([...COMPACT_CABIN_SLOTS.map((slot) => slot.employee), "Unconfigured Agent"]);
    expect(assignments).toHaveLength(COMPACT_CABIN_SLOTS.length);
    expect(overflow).toEqual(["Unconfigured Agent"]);
  });
});
