import type { ProviderId } from "../../shared/aether";
import { configureProvider, getProviderAdapter, getProviderDefaults, listProviderStatuses } from "./providers";

export type CliProviderOption = {
  id: Exclude<ProviderId, "manus">;
  label: string;
  secretName: string;
  storageProvider: Exclude<ProviderId, "manus">;
  requiresCompatibilityAcknowledgement?: boolean;
  requiresEndpointAndModel?: boolean;
};

const cliProviderOptions: CliProviderOption[] = [
  { id: "gemini", label: "Gemini", secretName: "GEMINI_API_KEY", storageProvider: "gemini" },
  { id: "mistral", label: "Mistral", secretName: "MISTRAL_API_KEY", storageProvider: "mistral" },
  { id: "deepseek", label: "DeepSeek", secretName: "DEEPSEEK_API_KEY", storageProvider: "deepseek" },
  { id: "arcee", label: "Arcee", secretName: "ARCEE_API_KEY", storageProvider: "arcee", requiresEndpointAndModel: true },
  { id: "grok", label: "Grok", secretName: "GROK_API_KEY", storageProvider: "grok" },
  { id: "sambanova", label: "SambaNova", secretName: "SAMBANOVA_API_KEY", storageProvider: "sambanova" },
  { id: "openrouter", label: "OpenRouter / North Mini Code", secretName: "OPENROUTER_API_KEY", storageProvider: "openrouter" },
  {
    id: "devstral",
    label: "Devstral Small 2 (retired-model compatibility route)",
    secretName: "DEVSTRAL_API_KEY",
    storageProvider: "devstral",
    requiresCompatibilityAcknowledgement: true,
  },
  { id: "nemotron", label: "Nemotron 3 Ultra (NVIDIA API Catalog)", secretName: "NVIDIA_API_KEY", storageProvider: "nemotron" },
];

export function getCliProviderOptions() {
  return cliProviderOptions.map((option) => ({ ...option }));
}

export function getCliProviderOption(id: Exclude<ProviderId, "manus">) {
  return cliProviderOptions.find((option) => option.id === id);
}

export function getCliProviderDefaults(id: Exclude<ProviderId, "manus">) {
  return getProviderDefaults(id);
}

export async function hasConfiguredExternalProvider() {
  const statuses = await listProviderStatuses();
  return statuses.some((status) => status.id !== "manus" && status.configured);
}

export async function configureCliProvider(input: {
  provider: Exclude<ProviderId, "manus">;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  compatibilityAcknowledged?: boolean;
}) {
  const option = getCliProviderOption(input.provider);
  if (!option) throw new Error("That provider is not supported by the AetherOffice terminal setup.");
  if (option.requiresEndpointAndModel && (!input.baseUrl?.trim() || !input.model?.trim())) {
    throw new Error(`${option.label} requires both a chat-completions endpoint and model identifier.`);
  }

  return configureProvider({
    provider: option.storageProvider,
    apiKey: input.apiKey,
    ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
    ...(input.model ? { model: input.model } : {}),
    ...(input.compatibilityAcknowledged ? { compatibilityAcknowledged: true } : {}),
  });
}

export async function testCliProviderConfiguration(provider: Exclude<ProviderId, "manus">) {
  try {
    await getProviderAdapter(provider).generate({
      system: "You are a connectivity check. Reply with exactly OK.",
      user: "OK",
    });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      message: "AetherOffice could not confirm this provider connection. Check the key, account access, model availability, and endpoint, then run AetherOffice setup again.",
    };
  }
}
