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
});
