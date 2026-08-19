import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readProviderConfig, removeProviderConfig, saveProviderConfig } from "./vault";

const originalConfigHome = process.env.AETHER_CONFIG_HOME;
let testDirectory = "";

afterEach(async () => {
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = "";
  if (originalConfigHome) process.env.AETHER_CONFIG_HOME = originalConfigHome;
  else delete process.env.AETHER_CONFIG_HOME;
});

describe("encrypted local provider vault", () => {
  it("encrypts a configured API key and never persists the plaintext value", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "aether-vault-"));
    process.env.AETHER_CONFIG_HOME = testDirectory;
    await saveProviderConfig("deepseek", { apiKey: "sensitive-key-never-plain", model: "deepseek-v4-flash" });
    expect(await readProviderConfig("deepseek")).toMatchObject({ model: "deepseek-v4-flash" });
    const raw = await readFile(join(testDirectory, "providers.enc.json"), "utf8");
    expect(raw).not.toContain("sensitive-key-never-plain");
    await removeProviderConfig("deepseek");
    expect(await readProviderConfig("deepseek")).toBeUndefined();
  });
});
