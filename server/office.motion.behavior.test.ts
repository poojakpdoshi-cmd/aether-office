import { describe, expect, it } from "vitest";
import { createAgentMotionFrames, resolveOfficeLocation, type OfficeEmployee } from "../client/src/components/LiveOffice";
import type { CompactCabinSlot } from "../client/src/components/cabinSlots";

const slot: CompactCabinSlot = {
  id: "test-station",
  employee: "Gemini",
  station: { x: "12%", y: "24%" },
  laptop: { left: "10%", top: "20%" },
  desk: { x: "12%", y: "24%" },
};

const employee = (status: string): OfficeEmployee => ({ name: "Gemini", shortName: "G", role: "Engineer", status, accent: "from-sky-400" });

describe("real office motion behavior", () => {
  it("maps verified employee status transitions to the correct visible work locations", () => {
    expect(resolveOfficeLocation(employee("THINKING"), slot)).toMatchObject({ x: "12%", y: "24%", state: "walking" });
    expect(resolveOfficeLocation(employee("IN_MEETING"), slot)).toMatchObject({ x: "49%", y: "48%", state: "meeting" });
    expect(resolveOfficeLocation(employee("TESTING"), slot)).toMatchObject({ x: "50%", y: "92%", state: "testing" });
    expect(resolveOfficeLocation(employee("COMPLETED"), slot)).toMatchObject({ x: "50%", y: "94%", state: "complete" });
  });

  it("keeps transform-only movement at desktop and preserves the mobile scale in both animation frames", () => {
    expect(createAgentMotionFrames(120, -40, false)).toEqual([
      { transform: "translate3d(calc(-50% + 120px), calc(-50% + -40px), 0)" },
      { transform: "translate3d(-50%, -50%, 0)" },
    ]);
    expect(createAgentMotionFrames(120, -40, true)).toEqual([
      { transform: "translate3d(calc(-50% + 120px), calc(-50% + -40px), 0) scale(.82)" },
      { transform: "translate3d(-50%, -50%, 0) scale(.82)" },
    ]);
  });
});
