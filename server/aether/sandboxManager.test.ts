import { describe, expect, it } from "vitest";
import { createSandboxContainerArgs } from "./sandboxManager";

describe("container-backed employee sandbox policy", () => {
  it("creates non-root, network-disabled, read-only containers with distinct persistent volumes", () => {
    const args = createSandboxContainerArgs({ containerName: "aether-sandbox-a", volumeName: "aether-workspace-a" });
    expect(args).toContain("--network");
    expect(args[args.indexOf("--network") + 1]).toBe("none");
    expect(args).toContain("--read-only");
    expect(args).toContain("--cap-drop");
    expect(args).toContain("--pids-limit");
    expect(args).toContain("--memory");
    expect(args).toContain("--cpus");
    expect(args).toContain("--user");
    expect(args[args.indexOf("--user") + 1]).toBe("10001:10001");
    expect(args[args.indexOf("--volume") + 1]).toBe("aether-workspace-a:/workspace:rw");
    expect(args).toContain("aetheroffice/employee-sandbox:1.0.0");
  });
});
