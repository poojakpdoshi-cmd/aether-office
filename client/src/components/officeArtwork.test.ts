import { describe, expect, it } from "vitest";
import { ACTIVE_OFFICE_BACKGROUND, OFFICE_ARTWORK_GENERATION_ENABLED, OFFICE_ARTWORK_POLICY } from "./officeArtwork";

describe("office artwork policy", () => {
  it("uses the Owner-selected storage asset and disables automatic artwork generation", () => {
    expect(OFFICE_ARTWORK_POLICY).toBe("owner-supplied-only");
    expect(OFFICE_ARTWORK_GENERATION_ENABLED).toBe(false);
    expect(ACTIVE_OFFICE_BACKGROUND).toBe("/manus-storage/owner-selected-office-floor_2f95057d.webp");
  });
});
