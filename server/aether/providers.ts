import type { EmployeeId, ProviderId } from "../../shared/aether";
import { invokeLLM } from "../_core/llm";
import { readProviderConfig, removeProviderConfig, saveProviderConfig } from "./vault";

export type ProviderStatus = {
  id: ProviderId;
  label: string;
  configured: boolean;
  route: "built-in" | "direct" | "gateway";
  secretEnvironmentVariable?: string;
};

export type ProviderAdapter = {
  id: ProviderId;
  label: string;
  isConfigured: () => Promise<boolean>;
  generate: (input: { system: string; user: string }) => Promise<string>;
};

const providerMeta: Record<ProviderId, Omit<ProviderStatus, "configured">> = {
  manus: { id: "manus", label: "Manus", route: "built-in" },
  gemini: { id: "gemini", label: "Gemini", route: "direct", secretEnvironmentVariable: "GEMINI_API_KEY" },
  mistral: { id: "mistral", label: "Mistral", route: "direct", secretEnvironmentVariable: "MISTRAL_API_KEY" },
  deepseek: { id: "deepseek", label: "DeepSeek", route: "direct", secretEnvironmentVariable: "DEEPSEEK_API_KEY" },
  arcee: { id: "arcee", label: "Arcee", route: "direct", secretEnvironmentVariable: "ARCEE_API_KEY" },
  grok: { id: "grok", label: "Grok", route: "direct", secretEnvironmentVariable: "GROK_API_KEY" },
  sambanova: { id: "sambanova", label: "SambaNova", route: "direct", secretEnvironmentVariable: "SAMBANOVA_API_KEY" },
  openrouter: { id: "openrouter", label: "OpenRouter", route: "gateway", secretEnvironmentVariable: "OPENROUTER_API_KEY" },
};

const employeeProvider: Record<EmployeeId, ProviderId> = {
  Manus: "manus",
  Gemini: "gemini",
  Mistral: "mistral",
  DeepSeek: "deepseek",
  Arcee: "arcee",
  Grok: "grok",
  SambaNova: "sambanova",
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
  arcee: directAdapter("arcee"),
  grok: directAdapter("grok"),
  sambanova: directAdapter("sambanova"),
  openrouter: directAdapter("openrouter"),
};

export async function listProviderStatuses(): Promise<ProviderStatus[]> {
  return Promise.all(Object.values(providerMeta).map(async (metadata) => ({
    ...metadata,
    configured: await adapters[metadata.id].isConfigured(),
  })));
}

export function getEmployeeProvider(employee: EmployeeId) {
  return employeeProvider[employee];
}

export function getProviderAdapter(provider: ProviderId) {
  return adapters[provider];
}

export async function isEmployeeAvailable(employee: EmployeeId) {
  return adapters[employeeProvider[employee]].isConfigured();
}

type EffectiveProviderConfig = { apiKey: string; model?: string; baseUrl?: string };

const environmentDefaults: Partial<Record<ProviderId, Omit<EffectiveProviderConfig, "apiKey">>> = {
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-3.7-flash" },
  mistral: { baseUrl: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
  deepseek: { baseUrl: "https://api.deepseek.com/chat/completions", model: "deepseek-v4-flash" },
  grok: { baseUrl: "https://api.x.ai/v1/chat/completions", model: "grok-4" },
  sambanova: { baseUrl: "https://api.sambanova.ai/v1/chat/completions", model: "Meta-Llama-3.3-70B-Instruct" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1/chat/completions" },
};

async function getEffectiveProviderConfig(provider: ProviderId): Promise<EffectiveProviderConfig | undefined> {
  if (provider === "manus") return undefined;
  const persisted = await readProviderConfig(provider);
  if (persisted) return { ...environmentDefaults[provider], ...persisted };
  const environmentVariable = providerMeta[provider].secretEnvironmentVariable;
  const apiKey = environmentVariable ? process.env[environmentVariable] : undefined;
  return apiKey ? { apiKey, ...environmentDefaults[provider] } : undefined;
}

export async function configureProvider(input: { provider: Exclude<ProviderId, "manus">; apiKey: string; baseUrl?: string; model?: string }) {
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
