import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ProviderId } from "../../shared/aether";

type StoredProviderConfig = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  compatibilityAcknowledged?: boolean;
};

type VaultPayload = Partial<Record<ProviderId | "arcee", StoredProviderConfig>>;

type EncryptedPayload = {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
};

function configDirectory() {
  return process.env.AETHER_CONFIG_HOME || join(homedir(), ".aether-office");
}

function keyPath() {
  return join(configDirectory(), "vault.key");
}

function vaultPath() {
  return join(configDirectory(), "providers.enc.json");
}

async function ensureDirectory() {
  await mkdir(configDirectory(), { recursive: true, mode: 0o700 });
  await chmod(configDirectory(), 0o700);
}

async function loadKey() {
  await ensureDirectory();
  try {
    const key = await readFile(keyPath());
    if (key.length !== 32) throw new Error("The local provider vault key is invalid.");
    return key;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    const key = randomBytes(32);
    await writeFile(keyPath(), key, { mode: 0o600 });
    await chmod(keyPath(), 0o600);
    return key;
  }
}

async function readVault(): Promise<VaultPayload> {
  try {
    const encrypted = JSON.parse(await readFile(vaultPath(), "utf8")) as EncryptedPayload;
    if (encrypted.version !== 1) throw new Error("Unsupported local provider vault version.");
    const key = await loadKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64"));
    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, "base64")), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as VaultPayload;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw new Error("Unable to read the encrypted local provider configuration.");
  }
}

async function writeVault(payload: VaultPayload) {
  const key = await loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const encrypted: EncryptedPayload = {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  await writeFile(vaultPath(), JSON.stringify(encrypted), { mode: 0o600 });
  await chmod(vaultPath(), 0o600);
}

export async function readProviderConfig(provider: ProviderId) {
  const payload = await readVault();
  return payload[provider];
}

export async function saveProviderConfig(provider: Exclude<ProviderId, "manus">, config: StoredProviderConfig) {
  if (!config.apiKey.trim()) throw new Error("An API key is required.");
  const payload = await readVault();
  payload[provider] = {
    apiKey: config.apiKey.trim(),
    ...(config.model?.trim() ? { model: config.model.trim() } : {}),
    ...(config.baseUrl?.trim() ? { baseUrl: config.baseUrl.trim().replace(/\/$/, "") } : {}),
    ...(config.compatibilityAcknowledged ? { compatibilityAcknowledged: true } : {}),
  };
  await writeVault(payload);
}

export async function removeProviderConfig(provider: Exclude<ProviderId, "manus">) {
  const payload = await readVault();
  delete payload[provider];
  await writeVault(payload);
}

export async function removeRetiredProviderConfig() {
  const payload = await readVault();
  if (!payload.arcee) return false;
  delete payload.arcee;
  await writeVault(payload);
  return true;
}
