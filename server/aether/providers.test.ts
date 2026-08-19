import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureProvider, getEmployeeProvider, getProviderDefaults, listProviderStatuses, recognizeProviderKey } from "./providers";

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
    expect(getProviderDefaults("nemotron")).toMatchObject({ baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions", model: "nvidia/nemotron-3-ultra-550b-a55b" });
  });

  it("uses the Mistral-compatible endpoint for the Devstral Small 2 compatibility-gated route", () => {
    expect(getProviderDefaults("devstral")).toMatchObject({ baseUrl: "https://api.mistral.ai/v1/chat/completions", model: "labs-devstral-small-2512" });
  });

  it("requires explicit Owner acknowledgement before accepting the retired Devstral Small 2 route", async () => {
    await expect(configureProvider({ provider: "devstral", apiKey: "local-test-key-value", compatibilityAcknowledged: false })).rejects.toThrow("retired");
  });

  it("persists acknowledged Devstral and NVIDIA Nemotron local provider configuration without exposing credentials", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const configHome = mkdtempSync(join(tmpdir(), "aether-provider-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    try {
      await configureProvider({ provider: "devstral", apiKey: "devstral-test-key", compatibilityAcknowledged: true });
      await configureProvider({ provider: "nemotron", apiKey: "nvidia-test-key" });
      const statuses = await listProviderStatuses();
      expect(statuses.find((provider) => provider.id === "devstral")).toMatchObject({ configured: true, route: "direct" });
      expect(statuses.find((provider) => provider.id === "nemotron")).toMatchObject({ configured: true, route: "direct", secretEnvironmentVariable: "NVIDIA_API_KEY" });
    } finally {
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("persists Gemini configuration in the local encrypted vault without a database", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const configHome = mkdtempSync(join(tmpdir(), "aether-gemini-provider-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    try {
      await configureProvider({ provider: "gemini", apiKey: "gemini-test-key", ...getProviderDefaults("gemini") });
      const gemini = (await listProviderStatuses()).find((provider) => provider.id === "gemini");
      expect(gemini).toMatchObject({ configured: true, route: "direct", secretEnvironmentVariable: "GEMINI_API_KEY" });
      expect(getProviderDefaults("gemini")).toMatchObject({
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        model: "gemini-3.7-flash",
      });
    } finally {
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });
});
