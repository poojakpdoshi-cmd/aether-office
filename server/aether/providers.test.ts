import { describe, expect, it } from "vitest";
import { recognizeProviderKey } from "./providers";

describe("recognizeProviderKey", () => {
  it("recognizes only provider prefixes that are safe to identify without probing multiple services", () => {
    expect(recognizeProviderKey("AIza" + "a".repeat(28))).toBe("gemini");
    expect(recognizeProviderKey("sk-or-v1-" + "a".repeat(28))).toBe("openrouter");
    expect(recognizeProviderKey("xai-" + "a".repeat(28))).toBe("grok");
  });

  it("does not guess ambiguous generic keys", () => {
    expect(recognizeProviderKey("sk-" + "a".repeat(28))).toBeUndefined();
    expect(recognizeProviderKey("unrecognized-key-value")).toBeUndefined();
  });
});
