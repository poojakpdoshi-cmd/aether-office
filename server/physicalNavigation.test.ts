import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("physical office navigation", () => {
  it("keeps the exit door and manager files as direct invisible map targets", () => {
    const office = readFileSync(join(root, "client/src/components/LiveOffice.tsx"), "utf8");
    const styles = readFileSync(join(root, "client/src/pages/owner-floor.css"), "utf8");
    expect(office).toContain("office-exit-door-hotspot");
    expect(office).toContain("manager-file-pile");
    expect(office).toContain("onExitDoor");
    expect(styles).toContain(".text-free-office .office-exit-door-hotspot");
  });

  it("keeps management UI conditional instead of visible at office launch", () => {
    const home = readFileSync(join(root, "client/src/pages/Home.tsx"), "utf8");
    expect(home).toContain("exitPanelOpen ? <aside className=\"office-exit-panel\"");
    expect(home).toContain("Settings &amp; Connections");
    expect(home).toContain("Manager files &amp; photos");
  });
});
