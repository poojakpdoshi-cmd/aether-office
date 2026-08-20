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
    expect(cliSource).toContain("Starting your local office now");
    expect(cliSource).not.toContain("Run an optional live connection check now?");
  });
});
