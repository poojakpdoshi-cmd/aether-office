import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureProvider, generateForEmployee, getEmployeeProvider, getProviderDefaults, isEmployeeAvailable, listProviderStatuses, providerRequestTimeoutMs, rateLimitRetryDelayMs, recognizeProviderKey, resolveEmployeeProvider, reverifyConfiguredProvider } from "./providers";
import { readProviderConfig } from "./vault";
import { provisionOpenRouterProfiles, resetStateForTests } from "./state";

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
      expect(gemini).toMatchObject({ configured: true, verified: false, route: "direct", secretEnvironmentVariable: "GEMINI_API_KEY" });
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

  it("keeps legacy saved provider entries out of employee work until they are re-verified", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const configHome = mkdtempSync(join(tmpdir(), "aether-provider-legacy-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    try {
      await configureProvider({ provider: "gemini", apiKey: "legacy-saved-key", ...getProviderDefaults("gemini") });
      expect((await listProviderStatuses()).find((provider) => provider.id === "gemini")).toMatchObject({ configured: true, verified: false });
      await expect(isEmployeeAvailable("Gemini")).resolves.toBe(false);
    } finally {
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("re-verifies an existing encrypted key server-side without returning it to the caller", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-provider-reverify-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    try {
      await configureProvider({ provider: "gemini", apiKey: "legacy-reverify-key", ...getProviderDefaults("gemini") });
      const status = await reverifyConfiguredProvider("gemini");
      expect(status).toMatchObject({ id: "gemini", verified: true });
      expect(JSON.stringify(status)).not.toContain("legacy-reverify-key");
    } finally {
      globalThis.fetch = originalFetch;
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

  it("reports OpenRouter verification rate limits without saving the supplied key", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-openrouter-rate-limit-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "rate limit" }), { status: 429 });
    try {
      await expect(configureProvider({ provider: "openrouter", apiKey: "rate-limited-openrouter-key", model: "openrouter/free" }, { verifyConnection: true })).rejects.toThrow("rate-limiting verification");
      expect(await readProviderConfig("openrouter")).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("honors a bounded Retry-After delay and retries a transient OpenRouter verification limit", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-openrouter-retry-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      if (attempts === 1) return new Response(JSON.stringify({ error: "rate limit" }), { status: 429, headers: { "retry-after": "0" } });
      return new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      await configureProvider({ provider: "openrouter", apiKey: "retry-openrouter-key", model: "openrouter/free" }, { verifyConnection: true });
      expect(attempts).toBe(2);
      expect(rateLimitRetryDelayMs(new Response(null, { headers: { "retry-after": "99" } }), 0)).toBe(8_000);
      expect(rateLimitRetryDelayMs(new Response(null), 2)).toBe(4_000);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("retries a transient transport failure before treating OpenRouter as unreachable", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-openrouter-network-retry-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("simulated transient transport failure");
      return new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      await configureProvider({ provider: "openrouter", apiKey: "network-retry-openrouter-key", model: "openrouter/free" }, { verifyConnection: true });
      expect(attempts).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("uses the bounded DeepDiscuss deadline for each provider retry signal", () => {
    const originalTimeout = process.env.AETHER_DEEP_DISCUSS_TIMEOUT_MS;
    process.env.AETHER_DEEP_DISCUSS_TIMEOUT_MS = "20000";
    try {
      expect(providerRequestTimeoutMs()).toBe(20_000);
    } finally {
      if (originalTimeout === undefined) delete process.env.AETHER_DEEP_DISCUSS_TIMEOUT_MS;
      else process.env.AETHER_DEEP_DISCUSS_TIMEOUT_MS = originalTimeout;
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

  it("gives the OpenRouter handshake enough tokens for free routes that emit reasoning before text", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-openrouter-verification-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    let requestBody: { max_tokens?: unknown } | undefined;
    globalThis.fetch = async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as { max_tokens?: unknown };
      return new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      await configureProvider({ provider: "openrouter", apiKey: "openrouter-test-key", model: "openrouter/free" }, { verifyConnection: true });
      expect(requestBody?.max_tokens).toBe(128);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("retries only an empty OpenRouter handshake with a larger completion budget", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-openrouter-empty-handshake-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    const budgets: unknown[] = [];
    globalThis.fetch = async (_url, init) => {
      budgets.push((JSON.parse(String(init?.body)) as { max_tokens?: unknown }).max_tokens);
      const content = budgets.length === 1 ? "" : "OK";
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      await configureProvider({ provider: "openrouter", apiKey: "empty-handshake-openrouter-key", model: "openrouter/free" }, { verifyConnection: true });
      expect(budgets).toEqual([128, 512]);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
    }
  });

  it("sets a bounded completion budget for a provisioned OpenRouter free-route employee", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-openrouter-generation-budget-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    resetStateForTests();
    let requestBody: { max_tokens?: unknown } | undefined;
    globalThis.fetch = async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as { max_tokens?: unknown };
      return new Response(JSON.stringify({ choices: [{ message: { content: "Planning response" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
      await configureProvider({ provider: "openrouter", apiKey: "generation-budget-openrouter-key", model: "openrouter/free" }, { verifyConnection: true });
      const [worker] = provisionOpenRouterProfiles("openrouter/free", 1).created;
      await generateForEmployee(worker!.id, { system: "Plan safely.", user: "Provide an observation." });
      expect(requestBody?.max_tokens).toBe(1024);
      await generateForEmployee(worker!.id, { system: "Synthesize safely.", user: "Return a complete plan.", maxTokens: 2048 });
      expect(requestBody?.max_tokens).toBe(2048);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
      else process.env.AETHER_CONFIG_HOME = originalConfigHome;
      rmSync(configHome, { recursive: true, force: true });
      resetStateForTests();
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

  it("tries the next verified external provider when a configured built-in manager and first fallback both fail", async () => {
    const originalConfigHome = process.env.AETHER_CONFIG_HOME;
    const originalForgeKey = process.env.BUILT_IN_FORGE_API_KEY;
    const originalFetch = globalThis.fetch;
    const configHome = mkdtempSync(join(tmpdir(), "aether-manager-fallback-chain-test-"));
    process.env.AETHER_CONFIG_HOME = configHome;
    process.env.BUILT_IN_FORGE_API_KEY = "local-forge-test-key";
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "Verified" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    try {
      await configureProvider({ provider: "gemini", apiKey: "first-fallback-test-key", ...getProviderDefaults("gemini") }, { verifyConnection: true });
      await configureProvider({ provider: "openrouter", apiKey: "second-fallback-test-key", model: "openrouter/free" }, { verifyConnection: true });
      globalThis.fetch = async (url) => {
        const endpoint = String(url);
        if (endpoint.includes("forge")) return new Response(JSON.stringify({ error: "precondition unavailable" }), { status: 412 });
        if (endpoint.includes("generativelanguage")) return new Response(JSON.stringify({ error: "first fallback unavailable" }), { status: 503 });
        if (endpoint.includes("openrouter")) return new Response(JSON.stringify({ choices: [{ message: { content: "Second verified fallback reply" } }] }), { status: 200, headers: { "content-type": "application/json" } });
        return new Response(JSON.stringify({ error: "unexpected endpoint" }), { status: 500 });
      };
      await expect(generateForEmployee("Manus", { system: "Be concise.", user: "Hello" })).resolves.toBe("Second verified fallback reply");
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
