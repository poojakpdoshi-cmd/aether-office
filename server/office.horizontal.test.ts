import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const officeSource = readFileSync(new URL("../client/src/components/LiveOffice.tsx", import.meta.url), "utf8");
const artworkSource = readFileSync(new URL("../client/src/components/officeArtwork.ts", import.meta.url), "utf8");
const floorStyles = readFileSync(new URL("../client/src/pages/owner-floor.css", import.meta.url), "utf8");

describe("horizontal text-free office map", () => {
  it("uses the approved 16:9 artwork with a larger Discussion Room and no Manus marker", () => {
    expect(artworkSource).toContain("aether-office-horizontal-16x9_8fd4a4b4.png");
    expect(officeSource).toContain('employee.name === "Manus" ? null : <span className="illustrated-agent-dot" />');
    expect(floorStyles).toContain("aspect-ratio: 16 / 9");
    expect(floorStyles).toContain(".text-free-office .office-deep-discuss { left: 32%; top: 35%; width: 36%; height: 42%; }");
  });

  it("keeps the Discussion Room directly clickable without a visible frame and uses the prior valid Manager Cabin artwork only as a recovery layer", () => {
    const globalStyles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(officeSource).toContain('<div className="manager-cabin-recovery" aria-hidden="true" />');
    expect(floorStyles).toContain('background-image: url("/manus-storage/owner-selected-office-floor_2f95057d.webp")');
    expect(globalStyles).toContain(".deep-discuss-room-frame{display:none}");
    expect(officeSource).toContain('className="office-hotspot office-deep-discuss"');
  });
});
