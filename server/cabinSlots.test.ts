import { describe, expect, it } from "vitest";
import { allocateCompactCabinSlots } from "../client/src/components/cabinSlots";
import { buildOfficeHotspotPlan } from "../client/src/components/LiveOffice";

describe("expanded office cabin allocation", () => {
  it("assigns each requested new employee a physical cabin, desk, and laptop target", () => {
    const requested = ["North Mini Code", "Devstral Small 2", "Nemotron 3 Ultra"];
    const allocation = allocateCompactCabinSlots(requested);
    expect(allocation.overflow).toEqual([]);
    expect(allocation.assignments.map((slot) => slot.employee)).toEqual(requested);
    allocation.assignments.forEach((slot) => {
      expect(slot.station.x).toMatch(/%$/);
      expect(slot.desk.y).toMatch(/%$/);
      expect(slot.laptop.left).toMatch(/%$/);
    });
  });

  it("renders configured active additions with all direct office interaction targets", () => {
    const requested = ["North Mini Code", "Devstral Small 2", "Nemotron 3 Ultra"];
    const office = buildOfficeHotspotPlan(requested.map((name) => ({ name, shortName: name, role: "Configured", status: "IDLE", accent: "sky" })));
    expect(office.assignedEmployees.map((employee) => employee.name)).toEqual(requested);
    requested.forEach((employee) => {
      expect(office.hotspots).toEqual(expect.arrayContaining([
        { employee, target: `${employee} Desk` },
        { employee, target: `${employee} Laptop` },
        { employee, target: employee },
      ]));
    });
  });
});
