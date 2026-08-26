import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_FLOOR_HOTSPOT, serviceFloorOverlapsAnyLaptop } from "../client/src/components/officeHotspots";

const root = process.cwd();

describe("physical office navigation", () => {
  it("keeps the empty-floor service-floor route as a direct invisible map target and removes stale no-op manager hotspots", () => {
    const office = readFileSync(join(root, "client/src/components/LiveOffice.tsx"), "utf8");
    const styles = readFileSync(join(root, "client/src/pages/owner-floor.css"), "utf8");
    expect(office).toContain("office-empty-floor-zone");
    expect(office).toContain("onOpenEmptyFloor");
    expect(office).not.toContain("office-exit-door-hotspot");
    expect(office).not.toContain("manager-file-pile");
    expect(styles).toContain(".text-free-office .office-empty-floor-zone");
    expect(styles).toContain(".text-free-office .real-office-stage { position: relative;");
    expect(styles).toContain("overflow: hidden;");
    expect(styles).toContain(".office-bottom-panel");
  });

  it("layers broad corridor inspection underneath real employee and service-floor controls", () => {
    const styles = readFileSync(join(root, "client/src/pages/owner-floor.css"), "utf8");
    expect(styles).toContain(".office-corridor-zone { position: absolute; z-index: 3;");
    expect(styles).toContain(".text-free-office .office-room-zone { position: absolute; z-index: 7;");
    expect(styles).toContain(".text-free-office .office-work-zone { z-index: 7;");
    expect(styles).toContain(".text-free-office .office-laptop-zone { position: absolute; z-index: 8;");
    expect(styles).toContain(".text-free-office .office-empty-floor-zone { position: absolute; z-index: 9;");
    expect(EMPTY_FLOOR_HOTSPOT).toEqual({ left: "65%", top: "70%", width: "14%", height: "20%" });
    expect(serviceFloorOverlapsAnyLaptop()).toBe(false);
  });

  it("keeps management UI conditional instead of visible at office launch", () => {
    const home = readFileSync(join(root, "client/src/pages/Home.tsx"), "utf8");
    expect(home).toContain("managementPanel={<aside className=\"office-bottom-panel\"");
    expect(home).toContain("Settings &amp; Connections");
    expect(home).toContain("Manager files &amp; photos");
    expect(home).toContain("Current work now");
    expect(home).toContain("snapshot?.currentWork");
  });

  it("routes a physical cabin to its named room and its laptop to a real current-work computer view", () => {
    const office = readFileSync(join(root, "client/src/components/LiveOffice.tsx"), "utf8");
    const home = readFileSync(join(root, "client/src/pages/Home.tsx"), "utf8");
    const styles = readFileSync(join(root, "client/src/pages/owner-floor.css"), "utf8");
    expect(office).toContain("office-room-zone");
    expect(office).toContain("onOpenEmployeeRoom(slot.employee)");
    expect(office).toContain("onInspectEmployeeComputer(slot.employee)");
    expect(home).toContain("`${employee} Room`");
    expect(home).toContain("`${employee} Computer`");
    expect(home).toContain("current authorized sandbox state");
    expect(home).toContain("Live current work only");
    expect(home).toContain("Back to office");
    expect(styles).toContain(".text-free-office .office-room-zone");
  });
});
