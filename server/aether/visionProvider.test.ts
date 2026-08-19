import { describe, expect, it } from "vitest";
import { getConfiguredVisionProvider } from "./providers";

describe("configured vision provider gate", () => {
  it("rejects inspection when the built-in vision provider is not configured", async () => {
    const original = process.env.BUILT_IN_FORGE_API_KEY;
    delete process.env.BUILT_IN_FORGE_API_KEY;
    await expect(getConfiguredVisionProvider())
      .rejects.toThrow("No configured vision-capable provider is available");
    if (original === undefined) delete process.env.BUILT_IN_FORGE_API_KEY;
    else process.env.BUILT_IN_FORGE_API_KEY = original;
  });
});
