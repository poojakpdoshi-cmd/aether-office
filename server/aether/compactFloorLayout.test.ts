import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const officeComponent = readFileSync(fileURLToPath(new URL("../../client/src/components/LiveOffice.tsx", import.meta.url)), "utf8");
const compactFloorStyles = readFileSync(fileURLToPath(new URL("../../client/src/pages/owner-floor.css", import.meta.url)), "utf8");
const homePage = readFileSync(fileURLToPath(new URL("../../client/src/pages/Home.tsx", import.meta.url)), "utf8");

describe("Owner-selected compact office floor", () => {
  it("uses the selected asset and provides direct room, desk, object, and corridor targets", () => {
    expect(officeComponent).toContain('/manus-storage/owner-selected-office-floor_2f95057d.webp');
    expect(officeComponent).toContain('aria-label="Open Manager Cabin"');
    expect(officeComponent).toContain('aria-label="Open DeepDiscuss Room"');
    expect(officeComponent).toContain('aria-label="Provide files or photos to the Manager"');
    expect(officeComponent).toContain('aria-label="Open the secure Provider Locker"');
    expect(officeComponent).toContain('aria-label="Inspect Central Corridor"');
  });

  it("contains compact portrait and mobile rules for the selected map", () => {
    expect(compactFloorStyles).toContain('width: min(100%, 680px)');
    expect(compactFloorStyles).toContain('@media (max-width: 760px)');
    expect(compactFloorStyles).toContain('.office-corridor-zone');
  });

  it("opens the dedicated upload panel only from the physical Manager desk files/photos control", () => {
    expect(officeComponent).toContain('onClick={onDeskFiles} className="manager-file-pile"');
    expect(homePage).toContain('onDeskFiles={() => setOfficeFocus("Manager Desk Files")}');
    expect(homePage).toContain('officeFocus === "Manager Desk Files"');
    expect(homePage).toContain('Manager requested files or photos');
  });
});
