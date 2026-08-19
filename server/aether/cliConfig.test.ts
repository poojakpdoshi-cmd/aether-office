import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { configureCliProvider, getCliProviderOptions, hasConfiguredExternalProvider } from "./cliConfig";

const originalConfigHome = process.env.AETHER_CONFIG_HOME;
const temporaryHomes: string[] = [];

afterEach(() => {
  if (originalConfigHome === undefined) delete process.env.AETHER_CONFIG_HOME;
  else process.env.AETHER_CONFIG_HOME = originalConfigHome;
  temporaryHomes.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
});

describe("terminal provider setup bridge", () => {
  it("lists only actual externally configurable provider choices without the platform-bound Manus credential", () => {
    const options = getCliProviderOptions();
    expect(options.map((option) => option.id)).toContain("nemotron");
    expect(options.map((option) => option.id)).toContain("devstral");
    expect(options.map((option) => option.id)).not.toContain("manus");
  });

  it("stores a selected provider through the encrypted vault and considers it configured without returning the key", async () => {
    const directory = mkdtempSync(join(tmpdir(), "aether-cli-config-"));
    temporaryHomes.push(directory);
    process.env.AETHER_CONFIG_HOME = directory;

    const status = await configureCliProvider({ provider: "nemotron", apiKey: "nvidia-test-key" });

    expect(status).toMatchObject({ id: "nemotron", configured: true, secretEnvironmentVariable: "NVIDIA_API_KEY" });
    expect(JSON.stringify(status)).not.toContain("nvidia-test-key");
    await expect(hasConfiguredExternalProvider()).resolves.toBe(true);
  });

  it("requires the existing explicit acknowledgement before saving Devstral Small 2", async () => {
    const directory = mkdtempSync(join(tmpdir(), "aether-cli-config-"));
    temporaryHomes.push(directory);
    process.env.AETHER_CONFIG_HOME = directory;

    await expect(configureCliProvider({ provider: "devstral", apiKey: "devstral-test-key" })).rejects.toThrow("retired");
  });
});
