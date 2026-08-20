import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertTeamPort, assertTeamResource, competitionIsolationStatus, createCompetitionTeamRuntime, listCompetitionTeamRuntimes, loadCompetitionTeamRuntime, registerCompetitionTeamRuntime, teamRuntimePaths } from "./teamIsolation";

describe("competition team isolation foundation", () => {
  it("creates disjoint roots and leaves parallel execution disabled", () => {
    const runtime = createCompetitionTeamRuntime({ teamId: "team-alpha", workspaceRoot: "/tmp/aether-team-alpha/workspace", browserProfileRoot: "/tmp/aether-team-alpha/browser", evidenceRoot: "/tmp/aether-team-alpha/evidence", loopbackPort: 43101 });
    expect(runtime.executionRegistryKey).toHaveLength(24);
    expect(runtime.parallelExecutionEnabled).toBe(false);
    expect(competitionIsolationStatus().enabled).toBe(false);
    expect(() => createCompetitionTeamRuntime({ teamId: "team-alpha", workspaceRoot: "/tmp/aether-team-alpha", browserProfileRoot: "/tmp/aether-team-alpha/browser", evidenceRoot: "/tmp/aether-team-alpha/evidence", loopbackPort: 43102 })).toThrow("separate roots");
  });

  it("rejects cross-team resources and foreign loopback ports", () => {
    const runtime = createCompetitionTeamRuntime({ teamId: "team-beta", workspaceRoot: "/tmp/aether-team-beta/workspace", browserProfileRoot: "/tmp/aether-team-beta/browser", evidenceRoot: "/tmp/aether-team-beta/evidence", loopbackPort: 43103 });
    expect(assertTeamResource(runtime, "/tmp/aether-team-beta/workspace/src/App.tsx", "workspace")).toContain("/workspace/src/App.tsx");
    expect(() => assertTeamResource(runtime, "/tmp/aether-team-alpha/workspace/src/App.tsx", "workspace")).toThrow("outside Team team-beta");
    expect(() => assertTeamPort(runtime, 43104)).toThrow("not assigned");
  });

  it("persists valid manifests and rejects loopback-port collisions", async () => {
    const root = await mkdtemp(join(tmpdir(), "aether-team-isolation-"));
    try {
      const registry = join(root, "registry");
      const alpha = createCompetitionTeamRuntime({ teamId: "team-alpha", ...teamRuntimePaths(root, "team-alpha"), loopbackPort: 43105 });
      const beta = createCompetitionTeamRuntime({ teamId: "team-beta", ...teamRuntimePaths(root, "team-beta"), loopbackPort: 43106 });
      await registerCompetitionTeamRuntime(alpha, registry);
      await registerCompetitionTeamRuntime(beta, registry);
      expect((await loadCompetitionTeamRuntime("team-alpha", registry)).teamId).toBe("team-alpha");
      expect(existsSync(alpha.workspaceRoot)).toBe(true);
      expect((await listCompetitionTeamRuntimes(registry)).map((team) => team.teamId)).toEqual(["team-alpha", "team-beta"]);
      const collision = createCompetitionTeamRuntime({ teamId: "team-gamma", ...teamRuntimePaths(root, "team-gamma"), loopbackPort: 43105 });
      await expect(registerCompetitionTeamRuntime(collision, registry)).rejects.toThrow("already assigned");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
