import { describe, expect, it } from "vitest";
import { ACTIVE_OFFICE_BACKGROUND, OFFICE_ANIMATION_STYLES, OFFICE_ARTWORK_GENERATION_ENABLED, OFFICE_ARTWORK_POLICY } from "./officeArtwork";

describe("office artwork policy", () => {
  it("uses the Owner-selected storage asset and disables automatic artwork generation", () => {
    expect(OFFICE_ARTWORK_POLICY).toBe("owner-authorized-manager-cabin-removal");
    expect(OFFICE_ARTWORK_GENERATION_ENABLED).toBe(false);
    expect(ACTIVE_OFFICE_BACKGROUND).toBe("/manus-storage/aetheroffice-office-no-manager-cabin_a8a18332.png");
  });

  it("offers three selectable office visual directions", () => {
    expect(Object.keys(OFFICE_ANIMATION_STYLES)).toEqual(["metro", "warm", "stealth"]);
    expect(OFFICE_ANIMATION_STYLES.warm.label).toBe("Warm Japanese");
    expect(OFFICE_ANIMATION_STYLES.stealth.label).toBe("Stealth night");
  });
});
