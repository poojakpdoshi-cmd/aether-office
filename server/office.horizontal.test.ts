import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const officeSource = readFileSync(new URL("../client/src/components/LiveOffice.tsx", import.meta.url), "utf8");
const artworkSource = readFileSync(new URL("../client/src/components/officeArtwork.ts", import.meta.url), "utf8");
const floorStyles = readFileSync(new URL("../client/src/pages/owner-floor.css", import.meta.url), "utf8");

describe("horizontal text-free office map", () => {
  it("uses the approved Manager-Cabin-free 16:9 artwork with a larger Discussion Room and no Manus marker", () => {
    expect(artworkSource).toContain("aetheroffice-office-no-manager-cabin_a8a18332.png");
    expect(officeSource).toContain('employee.name === "Manus" ? null : <span className="illustrated-agent-dot" />');
    expect(floorStyles).toContain("aspect-ratio: 16 / 9");
    expect(floorStyles).toContain(".text-free-office .office-deep-discuss { left: 32%; top: 35%; width: 36%; height: 42%; }");
    expect(floorStyles).toContain(".text-free-office .illustrated-agent-dot");
  });

  it("keeps the Discussion Room directly clickable without a visible frame", () => {
    const globalStyles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(officeSource).not.toContain("manager-cabin-recovery");
    expect(officeSource).not.toContain("manager-leg-repair");
    expect(floorStyles).not.toContain("manager-leg-repair");
    expect(globalStyles).toContain(".deep-discuss-room-frame{display:none}");
    expect(officeSource).toContain('className="office-hotspot office-deep-discuss"');
    expect(floorStyles).toContain(".text-free-office .illustrated-agent-dot,");
  });
});
