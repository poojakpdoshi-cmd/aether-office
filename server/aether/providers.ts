import type { EmployeeId, ProviderId } from "../../shared/aether";
import { invokeLLM } from "../_core/llm";
import { readProviderConfig, removeProviderConfig, removeRetiredProviderConfig, saveProviderConfig } from "./vault";
import { isEmployeeActive } from "./state";

export type ProviderStatus = {
  id: ProviderId;
  label: string;
  configured: boolean;
  route: "built-in" | "direct" | "gateway";
  model?: string;
  secretEnvironmentVariable?: string;
  compatibilityWarning?: string;
  availability: "ready" | "retired-gated";
};

export type ProviderAdapter = {
  id: ProviderId;
  label: string;
  isConfigured: () => Promise<boolean>;
  generate: (input: { system: string; user: string }) => Promise<string>;
};

const providerMeta: Record<ProviderId, Omit<ProviderStatus, "configured">> = {
  manus: { id: "manus", label: "Manus", route: "built-in", availability: "ready" },
  gemini: { id: "gemini", label: "Gemini", route: "direct", secretEnvironmentVariable: "GEMINI_API_KEY", availability: "ready" },
  mistral: { id: "mistral", label: "Mistral", route: "direct", secretEnvironmentVariable: "MISTRAL_API_KEY", availability: "ready" },
  deepseek: { id: "deepseek", label: "DeepSeek", route: "direct", secretEnvironmentVariable: "DEEPSEEK_API_KEY", availability: "ready" },
  grok: { id: "grok", label: "Grok", route: "direct", secretEnvironmentVariable: "GROK_API_KEY", availability: "ready" },
  sambanova: { id: "sambanova", label: "SambaNova", route: "direct", secretEnvironmentVariable: "SAMBANOVA_API_KEY", availability: "ready" },
  openrouter: { id: "openrouter", label: "OpenRouter", route: "gateway", secretEnvironmentVariable: "OPENROUTER_API_KEY", availability: "ready" },
  northmini: { id: "northmini", label: "North Mini Code", route: "gateway", secretEnvironmentVariable: "OPENROUTER_API_KEY", availability: "ready" },
  devstral: { id: "devstral", label: "Devstral Small 2", route: "direct", secretEnvironmentVariable: "DEVSTRAL_API_KEY", availability: "retired-gated", compatibilityWarning: "Retired compatibility route. It is unavailable until the owner explicitly acknowledges endpoint support; do not treat it as production-ready." },
  nemotron: { id: "nemotron", label: "Nemotron 3 Ultra", route: "direct", secretEnvironmentVariable: "NVIDIA_API_KEY", availability: "ready" },
};

const employeeProvider: Record<EmployeeId, ProviderId> = {
  Manus: "manus",
  Atlas: "manus",
  Nova: "manus",
  Gemini: "gemini",
  Mistral: "mistral",
  DeepSeek: "deepseek",
  Grok: "grok",
  SambaNova: "sambanova",
  "North Mini Code": "northmini",
  "Devstral Small 2": "devstral",
  "Nemotron 3 Ultra": "nemotron",
};

function getTextContent(content: string | unknown[]) {
  return typeof content === "string" ? content : content.map((item) => (typeof item === "object" && item && "text" in item ? String(item.text) : "")).join("\n");
}

const manusAdapter: ProviderAdapter = {
  id: "manus",
  label: "Manus",
  isConfigured: async () => Boolean(process.env.BUILT_IN_FORGE_API_KEY),
  generate: async ({ system, user }) => {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      reasoning: { effort: "low" },
      maxTokens: 2200,
    });
    const content = getTextContent(response.choices[0]?.message.content ?? "");
    if (!content.trim()) throw new Error("Manus returned an empty response.");
    return content;
  },
};

function directAdapter(provider: ProviderId): ProviderAdapter {
  const metadata = providerMeta[provider];
  return {
    id: provider,
    label: metadata.label,
    isConfigured: async () => Boolean(await getEffectiveProviderConfig(provider)),
    generate: async ({ system, user }) => {
      const config = await getEffectiveProviderConfig(provider);
      if (!config) throw new Error(`${metadata.label} is not configured.`);
      if (!config.baseUrl || !config.model) throw new Error(`${metadata.label} needs a model and chat-completions endpoint before it can join a meeting.`);
      const response = await fetch(config.baseUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.35,
        }),
      });
      if (!response.ok) throw new Error(`${metadata.label} request failed with status ${response.status}.`);
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content?.trim()) throw new Error(`${metadata.label} returned an empty response.`);
      return content;
    },
  };
}

const adapters: Record<ProviderId, ProviderAdapter> = {
  manus: manusAdapter,
  gemini: directAdapter("gemini"),
  mistral: directAdapter("mistral"),
  deepseek: directAdapter("deepseek"),
  grok: directAdapter("grok"),
  sambanova: directAdapter("sambanova"),
  openrouter: directAdapter("openrouter"),
  northmini: directAdapter("northmini"),
  devstral: directAdapter("devstral"),
  nemotron: directAdapter("nemotron"),
};

let retiredProviderCleanup: Promise<void> | undefined;

async function ensureRetiredProviderCleanup() {
  if (!retiredProviderCleanup) retiredProviderCleanup = removeRetiredProviderConfig().then(() => undefined).catch(() => undefined);
  await retiredProviderCleanup;
}

export async function listProviderStatuses(): Promise<ProviderStatus[]> {
  await ensureRetiredProviderCleanup();
  return Promise.all(Object.values(providerMeta).map(async (metadata) => {
    const effective = metadata.id === "manus" ? undefined : await getEffectiveProviderConfig(metadata.id);
    return {
      ...metadata,
      configured: await adapters[metadata.id].isConfigured(),
      model: metadata.id === "manus" ? "gpt-5-mini" : effective?.model?.slice(0, 120),
    };
  }));
}

export function getEmployeeProvider(employee: EmployeeId): ProviderId {
  if (employeeProvider[employee]) return employeeProvider[employee];
  if (employee.startsWith("Gemini Worker ")) return "gemini";
  if (employee.startsWith("Mistral Worker ")) return "mistral";
  if (employee.startsWith("DeepSeek Worker ")) return "deepseek";
  if (employee.startsWith("Grok Worker ")) return "grok";
  if (employee.startsWith("SambaNova Worker ")) return "sambanova";
  if (employee.startsWith("OpenRouter Worker ")) return "openrouter";
  if (employee.startsWith("North Mini Code Worker ")) return "northmini";
  if (employee.startsWith("Devstral Small 2 Worker ")) return "devstral";
  if (employee.startsWith("Nemotron 3 Ultra Worker ")) return "nemotron";
  return "manus";
}

export function getProviderAdapter(provider: ProviderId) {
  return adapters[provider];
}

export async function isEmployeeAvailable(employee: EmployeeId) {
  const provider = getEmployeeProvider(employee);
  if (!isEmployeeActive(employee) || !(await adapters[provider].isConfigured())) return false;
  if (provider === "devstral") return Boolean((await readProviderConfig("devstral"))?.compatibilityAcknowledged);
  return true;
}

export async function getConfiguredVisionProvider() {
  if (!(await manusAdapter.isConfigured())) throw new Error("No configured vision-capable provider is available for local image inspection.");
  return { provider: "Manus" as const, model: "gemini-3-flash-preview" as const };
}

type EffectiveProviderConfig = { apiKey: string; model?: string; baseUrl?: string; compatibilityAcknowledged?: boolean };

const environmentDefaults: Partial<Record<ProviderId, Omit<EffectiveProviderConfig, "apiKey">>> = {
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-3.7-flash" },
  mistral: { baseUrl: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
  deepseek: { baseUrl: "https://api.deepseek.com/chat/completions", model: "deepseek-v4-flash" },
  grok: { baseUrl: "https://api.x.ai/v1/chat/completions", model: "grok-4" },
  sambanova: { baseUrl: "https://api.sambanova.ai/v1/chat/completions", model: "Meta-Llama-3.3-70B-Instruct" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1/chat/completions" },
  northmini: { baseUrl: "https://openrouter.ai/api/v1/chat/completions", model: "cohere/north-mini-code:free" },
  devstral: { baseUrl: "https://api.mistral.ai/v1/chat/completions", model: "labs-devstral-small-2512" },
  nemotron: { baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions", model: "nvidia/nemotron-3-ultra-550b-a55b" },
};

export function getProviderDefaults(provider: ProviderId) {
  return environmentDefaults[provider];
}

async function getEffectiveProviderConfig(provider: ProviderId): Promise<EffectiveProviderConfig | undefined> {
  if (provider === "manus") return undefined;
  const persisted = await readProviderConfig(provider);
  if (persisted) return { ...environmentDefaults[provider], ...persisted };
  const compatibleGateway = provider === "northmini" ? "openrouter" : provider === "devstral" ? "mistral" : undefined;
  if (compatibleGateway) {
    const inherited = await readProviderConfig(compatibleGateway);
    if (inherited) return { ...environmentDefaults[provider], apiKey: inherited.apiKey, baseUrl: inherited.baseUrl ?? environmentDefaults[provider]?.baseUrl };
  }
  const environmentVariable = providerMeta[provider].secretEnvironmentVariable;
  const apiKey = environmentVariable ? process.env[environmentVariable] : undefined;
  return apiKey ? { apiKey, ...environmentDefaults[provider] } : undefined;
}

export async function configureProvider(input: { provider: Exclude<ProviderId, "manus">; apiKey: string; baseUrl?: string; model?: string; compatibilityAcknowledged?: boolean }) {
  if (input.provider === "devstral" && !input.compatibilityAcknowledged) throw new Error("Devstral Small 2 is retired. Owner acknowledgement and endpoint compatibility are required before configuration.");
  await saveProviderConfig(input.provider, input);
  const status = (await listProviderStatuses()).find((provider) => provider.id === input.provider);
  return status;
}

/**
 * Identify only API-key prefixes that are unambiguous. Ambiguous `sk-` keys are
 * deliberately not guessed, because sending a secret to multiple providers would
 * be unsafe and would violate the Owner's local-secret expectation.
 */
export function recognizeProviderKey(apiKey: string): Exclude<ProviderId, "manus"> | undefined {
  const key = apiKey.trim();
  if (/^AIza[\w-]{20,}$/.test(key)) return "gemini";
  if (/^sk-or-v1-[\w-]{16,}$/.test(key)) return "openrouter";
  if (/^xai-[\w-]{16,}$/i.test(key)) return "grok";
  return undefined;
}

export async function recognizeAndConfigureProvider(apiKey: string) {
  const provider = recognizeProviderKey(apiKey);
  if (!provider) return { recognized: false as const, status: undefined };

  // A positive response proves the supplied key works for its unambiguous provider.
  // The key never leaves this server function and is never included in its return value.
  const defaults = environmentDefaults[provider];
  if (!defaults?.baseUrl || !defaults.model) return { recognized: false as const, status: undefined };
  const response = await fetch(defaults.baseUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey.trim()}` },
    body: JSON.stringify({ model: defaults.model, messages: [{ role: "user", content: "Reply with OK." }], max_tokens: 8 }),
  });
  if (!response.ok) return { recognized: false as const, status: undefined };
  const status = await configureProvider({ provider, apiKey, ...defaults });
  return { recognized: true as const, provider, status };
}

export async function removeConfiguredProvider(provider: Exclude<ProviderId, "manus">) {
  await removeProviderConfig(provider);
  const status = (await listProviderStatuses()).find((item) => item.id === provider);
  return status;
}
