import { describe, expect, it } from "vitest";
import { containerRuntimeSetupMessage, detectContainerRuntime, requireContainerRuntime } from "./sandboxRuntime";

describe("local container runtime detection", () => {
  it("selects a running Docker daemon before Podman", async () => {
    const runtime = await detectContainerRuntime(async (command, args) => {
      if (command === "docker" && args[0] === "--version") return { stdout: "Docker version 27.0.0", stderr: "" };
      if (command === "docker" && args[0] === "info") return { stdout: "27.0.0", stderr: "" };
      throw new Error("unexpected command");
    });
    expect(runtime).toEqual(expect.objectContaining({ available: true, kind: "docker", serverVersion: "27.0.0" }));
  });

  it("reports a missing runtime without offering host execution", async () => {
    const runtime = await detectContainerRuntime(async () => {
      const error = Object.assign(new Error("not found"), { code: "ENOENT" });
      throw error;
    });
    expect(runtime).toEqual(expect.objectContaining({ available: false, reason: "not-installed" }));
    expect(containerRuntimeSetupMessage("win32")).toContain("never falls back to host command execution");
  });

  it("refuses sandbox use while an installed runtime daemon is unavailable", async () => {
    await expect(requireContainerRuntime(async (_command, args) => {
      if (args[0] === "--version") return { stdout: "Docker version 27.0.0", stderr: "" };
      throw new Error("daemon is stopped");
    })).rejects.toThrow("AetherOffice never falls back to host command execution");
  });
});
