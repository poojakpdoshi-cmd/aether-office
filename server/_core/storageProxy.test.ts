import { describe, expect, it } from "vitest";
import { storageKeyFromRouteParams } from "./storageProxy";

describe("storage proxy route parameters", () => {
  it("reconstructs nested keys from the Express 5 named wildcard parameter", () => {
    expect(storageKeyFromRouteParams({ key: ["office", "artwork", "metro.png"] })).toBe("office/artwork/metro.png");
    expect(storageKeyFromRouteParams({ key: "single.png" })).toBe("single.png");
  });

  it("rejects an omitted storage wildcard value", () => {
    expect(storageKeyFromRouteParams({})).toBeUndefined();
  });
});
