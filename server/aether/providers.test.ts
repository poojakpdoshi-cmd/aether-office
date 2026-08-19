import { describe, expect, it } from "vitest";
import { configureProvider, getEmployeeProvider, listProviderStatuses, recognizeProviderKey } from "./providers";

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

  it("maps the requested configurable employees to their explicit provider routes", () => {
    expect(getEmployeeProvider("North Mini Code")).toBe("northmini");
    expect(getEmployeeProvider("Devstral Small 2")).toBe("devstral");
    expect(getEmployeeProvider("Nemotron 3 Ultra")).toBe("nemotron");
  });

  it("uses the Owner-selected direct NVIDIA API Catalog route for Nemotron 3 Ultra", async () => {
    const nemotron = (await listProviderStatuses()).find((provider) => provider.id === "nemotron");
    expect(nemotron).toMatchObject({ label: "Nemotron 3 Ultra", route: "direct", secretEnvironmentVariable: "NVIDIA_API_KEY" });
  });

  it("requires explicit Owner acknowledgement before accepting the retired Devstral Small 2 route", async () => {
    await expect(configureProvider({ provider: "devstral", apiKey: "local-test-key-value", compatibilityAcknowledged: false })).rejects.toThrow("retired");
  });
});
