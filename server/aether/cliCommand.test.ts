import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cliSource = readFileSync(new URL("../../bin/aether-office.mjs", import.meta.url), "utf8");

describe("AetherOffice CLI command parsing", () => {
  it("routes documented terminal commands without interpreting them as workspace paths", async () => {
    const { parseCommand } = await import("../../bin/aether-office.mjs");
    expect(parseCommand([])).toEqual({ type: "start", workspace: "." });
    expect(parseCommand(["setup"])).toEqual({ type: "setup" });
    expect(parseCommand(["doctor"])).toEqual({ type: "doctor" });
    expect(parseCommand(["--version"])).toEqual({ type: "version" });
    expect(parseCommand(["--help"])).toEqual({ type: "help" });
  });

  it("rejects ambiguous command forms before any local workspace is started", async () => {
    const { parseCommand } = await import("../../bin/aether-office.mjs");
    expect(parseCommand(["--unknown"])).toMatchObject({ type: "invalid" });
    expect(parseCommand(["one", "two"])).toMatchObject({ type: "invalid" });
  });

  it("continues directly from first-run encrypted setup into the normal local-start path", () => {
    expect(cliSource).toContain("await runSetup({ launchAfterSetup: true });");
    expect(cliSource).toContain("Starting AetherOffice...");
    expect(cliSource).not.toContain("Run an optional live connection check now?");
  });

  it("walks providers sequentially with explicit skips, masked secret input, and no provider-selection screen", async () => {
    const { runSequentialProviderWizard } = await import("../../bin/aether-office.mjs");
    const writes: string[] = [];
    const visibleAnswers = ["n", "", "y", ""];
    const configured: unknown[] = [];
    const result = await runSequentialProviderWizard({
      getCliProviderOptions: () => [
        { id: "gemini", label: "Google Gemini", credentialLabel: "Gemini API key", purpose: "General reasoning.", storageProvider: "gemini" },
        { id: "mistral", label: "Mistral", credentialLabel: "Mistral API key", purpose: "Implementation.", storageProvider: "mistral" },
      ],
      configureCliProvider: async (input: unknown) => { configured.push(input); },
    }, {
      visible: async () => visibleAnswers.shift() || "",
      secret: async () => "vault-only-test-key",
      write: (message: string) => writes.push(message),
    });
    expect(result).toEqual({ configured: ["Google Gemini"], skipped: ["Mistral"] });
    expect(configured).toEqual([{ provider: "gemini", apiKey: "vault-only-test-key" }]);
    expect(writes.join("")).toContain("Provider 1 of 2");
    expect(writes.join("")).toContain("Provider 2 of 2");
    expect(writes.join("")).not.toContain("vault-only-test-key");
    expect(cliSource).toContain("process.stdin.setRawMode(true)");
    expect(cliSource).toContain("Skip this provider? [y/N]");
    expect(cliSource).not.toContain("Choose one or more provider numbers");
  });

  it("requires one usable provider before a first-run launch and retains optional setup, doctor, help, and version commands", () => {
    expect(cliSource).toContain("while (!(await cli.hasConfiguredExternalProvider()))");
    expect(cliSource).toContain("No AI provider has been configured");
    expect(cliSource).toContain("if (command.type === \"setup\") return runSetup()");
    expect(cliSource).toContain("if (command.type === \"doctor\") return runDoctor()");
    expect(cliSource).toContain("if (command.type === \"help\")");
    expect(cliSource).toContain("if (command.type === \"version\")");
  });
});
