import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureProvider, generateForEmployee, getEmployeeProvider, getProviderDefaults, isEmployeeAvailable, listProviderStatuses, recognizeProviderKey, resolveEmployeeProvider } from "./providers";
import { readProviderConfig } from "./vault";

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

  it("labels Devstral as retired-gated rather than a normal production-ready provider", async () => {
    const devstral = (await listProviderStatuses()).find((provider) => provider.id === "devstral");
    expect(devstral).toMatchObject({ availability: "retired-gated" });
    expect(devstral?.compatibilityWarning).toContain("do not treat it as production-ready");
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
      expect(statuses.find((provider) => provider.id === "devstral")).toMatchObject({ configured: true, route: "direct", availability: "retired-gated" });
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

  it("verifies a provider before persisting it and keeps rejected credentials out of the vault", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-provider-verification-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "invalid key" }), { status: 401 });
    try {
      await expect(configureProvider({ provider: "gemini", apiKey: "invalid-key", ...getProviderDefaults("gemini") }, { verifyConnection: true })).rejects.toThrow("Gemini rejected the configuration (status 401)");
      expect(await readProviderConfig("gemini")).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("persists a provider only after its selected endpoint returns a valid chat completion", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-provider-verified-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    try {
      const status = await configureProvider({ provider: "gemini", apiKey: "verified-test-key", ...getProviderDefaults("gemini") }, { verifyConnection: true });
      expect(status).toMatchObject({ id: "gemini", configured: true, verified: true, route: "direct" });
      expect(JSON.stringify(status)).not.toContain("verified-test-key");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("uses a verified external provider for the local manager when the Manus runtime is unavailable", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalForgeKey = process.env.BUILT_IN_FORGE_API_KEY;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-manager-fallback-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    delete process.env.BUILT_IN_FORGE_API_KEY;
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "External manager reply" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    try {
      await configureProvider({ provider: "gemini", apiKey: "verified-fallback-key", ...getProviderDefaults("gemini") }, { verifyConnection: true });
      await expect(resolveEmployeeProvider("Manus")).resolves.toBe("gemini");
      await expect(isEmployeeAvailable("Atlas")).resolves.toBe(true);
      await expect(generateForEmployee("Manus", { system: "Be concise.", user: "Hello" })).resolves.toBe("External manager reply");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalForgeKey === undefined) delete process.env.BUILT_IN_FORGE_API_KEY;
      else process.env.BUILT_IN_FORGE_API_KEY = originalForgeKey;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });
});
