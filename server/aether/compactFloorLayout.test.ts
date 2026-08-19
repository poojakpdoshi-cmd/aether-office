import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const officeComponent = readFileSync(fileURLToPath(new URL("../../client/src/components/LiveOffice.tsx", import.meta.url)), "utf8");
const compactFloorStyles = readFileSync(fileURLToPath(new URL("../../client/src/pages/owner-floor.css", import.meta.url)), "utf8");
const homePage = readFileSync(fileURLToPath(new URL("../../client/src/pages/Home.tsx", import.meta.url)), "utf8");
const officeArtworkPolicy = readFileSync(fileURLToPath(new URL("../../client/src/components/officeArtwork.ts", import.meta.url)), "utf8");
const laptopOverlayPolicy = readFileSync(fileURLToPath(new URL("../../client/src/lib/laptopOverlay.ts", import.meta.url)), "utf8");

describe("Owner-selected compact office floor", () => {
  it("uses the selected asset and provides direct room, desk, object, and corridor targets", () => {
    expect(officeComponent).toContain('src={ACTIVE_OFFICE_BACKGROUND}');
    expect(officeArtworkPolicy).toContain('OFFICE_ARTWORK_POLICY = "owner-supplied-only"');
    expect(officeArtworkPolicy).toContain('OFFICE_ARTWORK_GENERATION_ENABLED = false');
    expect(officeArtworkPolicy).toContain('aether-office-horizontal-16x9_8fd4a4b4.png');
    expect(officeComponent).toContain('aria-label="Open Manager Cabin"');
    expect(officeComponent).toContain('aria-label="Open DeepDiscuss Room"');
    expect(officeComponent).toContain('aria-label="Provide files or photos to the Manager"');
    expect(officeComponent).toContain('aria-label="Open the secure Provider Locker"');
    expect(officeComponent).toContain('aria-label="Inspect Central Corridor"');
  });

  it("contains horizontal 16:9 and mobile rules for the selected map", () => {
    expect(compactFloorStyles).toContain('width: min(100%, 680px)');
    expect(compactFloorStyles).toContain('aspect-ratio: 16 / 9');
    expect(compactFloorStyles).toContain('@media (max-width: 760px)');
    expect(compactFloorStyles).toContain('.office-corridor-zone');
  });

  it("opens the dedicated upload panel only from the physical Manager desk files/photos control", () => {
    expect(officeComponent).toContain('onClick={onDeskFiles} className="manager-file-pile"');
    expect(homePage).toContain('onDeskFiles={() => setOfficeFocus("Manager Desk Files")}');
    expect(homePage).toContain('officeFocus === "Manager Desk Files"');
    expect(homePage).toContain('Manager requested files or photos');
  });

  it("launches the Office view as a text-free animated map with accessible invisible targets", () => {
    expect(officeComponent).toContain('className="text-free-office"');
    expect(officeComponent).not.toContain('AEtherOffice · illustrated local workplace');
    expect(officeComponent).not.toContain('MANAGER CABIN');
    expect(officeComponent).not.toContain('DEEPDISCUSS ROOM');
    expect(officeComponent).not.toContain('WAITING AREA');
    expect(compactFloorStyles).toContain('.text-free-office');
    expect(homePage).toContain('useState<string | null>(null)');
    expect(homePage).toContain('activeView !== "Office" ? <header');
  });

  it("keeps cabins, rooms, desks, and employees as direct invisible interaction targets", () => {
    expect(officeComponent).toContain('className="office-hotspot office-manager" aria-label="Open Manager Cabin"');
    expect(officeComponent).toContain('className="office-hotspot office-deep-discuss" aria-label="Open DeepDiscuss Room"');
    expect(officeComponent).toContain('className="office-work-zone"');
    expect(officeComponent).toContain('className="office-laptop-zone"');
    expect(officeComponent).toContain('onInspect(`${slot.employee} Laptop`)');
    expect(officeComponent).toContain('className={cn("illustrated-agent", `illustrated-${pos.state}`)}');
    expect(officeComponent).not.toContain('illustrated-agent-label');
    expect(compactFloorStyles).toContain('.text-free-office .office-work-zone { width: 18%; height: 16%; transform: translate(-50%, -50%); opacity: 0; }');
    expect(compactFloorStyles).toContain('.text-free-office .office-laptop-zone { position: absolute; z-index: 8; width: 11%; height: 10%; transform: translate(-50%, -50%); cursor: pointer; opacity: 0; }');
    expect(homePage).toContain('officeFocus?.endsWith(" Laptop") ? officeFocus.replace(" Laptop", "")');
  });

  it("limits the map roster to configured providers and maps real statuses to meeting and workstation positions", () => {
    expect(homePage).toContain('employee.name === "Manus" || configuredEmployeeNames.has(employee.name)');
    expect(officeComponent).toContain('if (employee.status === "IN_MEETING") return { ...meetingPositions[employee.name], state: "meeting" }');
    expect(officeComponent).toContain('const { assignments } = allocateCompactCabinSlots(employees.map((employee) => employee.name))');
    expect(officeComponent).toContain('if (employee.status === "THINKING") return { ...slot.station, state: "walking" }');
    expect(officeComponent).toContain('if (employee.status === "CODING") return { ...slot.station, state: "coding" }');
    expect(officeComponent).toContain('if (employee.status === "REVIEWING") return { ...slot.station, state: "reviewing" }');
    expect(officeComponent).toContain('if (employee.status === "TESTING") return { x: "50%", y: "92%", state: "testing" }');
  });

  it("routes the physical Provider Locker to local-only secret-safe provider configuration", () => {
    expect(officeComponent).toContain('onClick={onProviderLocker} className="manager-provider-locker"');
    expect(officeComponent).toContain('aria-label="Open the secure Provider Locker"');
    expect(homePage).toContain('onProviderLocker={() => setActiveView("Settings")}');
    expect(homePage).toContain('Key values are never read back into the browser, rendered in UI, printed to logs, or added to Git.');
    expect(homePage).toContain('encrypted at rest, and never sent back to this browser.');
  });

  it("shows each employee laptop overlay from structured allowed fields without displaying secrets", () => {
    expect(homePage).toContain('dashboard?.activities.find((activity) => activity.employee === employee.name && activity.camera)?.camera');
    expect(homePage).toContain('createLaptopOverlay(employee.status, employee.focus, verifiedCamera)');
    expect(homePage).not.toContain('const verifiedEvents = dashboard?.activities ?? []');
    expect(homePage).toContain('Verified file scope, controlled tool, and task stage per employee.');
    expect(homePage).toContain('{overlay.fileScope}');
    expect(homePage).toContain('{overlay.tool} · {overlay.taskStage}');
    expect(homePage).toContain('{overlay.taskScope}');
    expect(laptopOverlayPolicy).toContain('const approvedTaskScopes = new Set');
    expect(laptopOverlayPolicy).toContain('taskScope: safeScope');
    expect(laptopOverlayPolicy).toContain('"Assigned work scope"');
    expect(homePage).toContain('Sensitive values, API keys, raw prompts, and unapproved file content are never displayed in camera previews.');
  });
});
