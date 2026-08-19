import { describe, expect, it } from "vitest";

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
});
