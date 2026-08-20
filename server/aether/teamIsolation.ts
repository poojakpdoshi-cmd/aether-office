import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, join, relative, resolve } from "node:path";

const TEAM_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,47}$/;

export type CompetitionTeamRuntime = {
  teamId: string;
  workspaceRoot: string;
  executionRegistryKey: string;
  browserProfileRoot: string;
  evidenceRoot: string;
  loopbackPort: number;
  parallelExecutionEnabled: false;
  createdAt: string;
};

export type CompetitionTeamSummary = Pick<CompetitionTeamRuntime, "teamId" | "loopbackPort" | "parallelExecutionEnabled" | "createdAt">;

function assertTeamId(teamId: string) {
  if (!TEAM_ID_PATTERN.test(teamId)) throw new Error("Team identifiers must use 2-48 lowercase letters, numbers, hyphens, or underscores.");
}

function absolute(label: string, input: string) {
  if (!isAbsolute(input)) throw new Error(`${label} must be an absolute local path.`);
  return resolve(input);
}

export function isWithin(parent: string, candidate: string) {
  const child = relative(parent, candidate);
  return child === "" || (!child.startsWith("..") && !isAbsolute(child));
}

function assertDisjoint(roots: Array<[string, string]>) {
  for (let index = 0; index < roots.length; index += 1) {
    for (let other = index + 1; other < roots.length; other += 1) {
      const [firstLabel, firstRoot] = roots[index];
      const [secondLabel, secondRoot] = roots[other];
      if (isWithin(firstRoot, secondRoot) || isWithin(secondRoot, firstRoot)) throw new Error(`${firstLabel} and ${secondLabel} must be separate roots for competition isolation.`);
    }
  }
}

export function createCompetitionTeamRuntime(input: Omit<CompetitionTeamRuntime, "executionRegistryKey" | "parallelExecutionEnabled" | "createdAt"> & { createdAt?: string }): CompetitionTeamRuntime {
  assertTeamId(input.teamId);
  if (!Number.isInteger(input.loopbackPort) || input.loopbackPort < 1024 || input.loopbackPort > 65535) throw new Error("Competition team loopback ports must be between 1024 and 65535.");
  const workspaceRoot = absolute("workspaceRoot", input.workspaceRoot);
  const browserProfileRoot = absolute("browserProfileRoot", input.browserProfileRoot);
  const evidenceRoot = absolute("evidenceRoot", input.evidenceRoot);
  assertDisjoint([["workspaceRoot", workspaceRoot], ["browserProfileRoot", browserProfileRoot], ["evidenceRoot", evidenceRoot]]);
  return { teamId: input.teamId, workspaceRoot, executionRegistryKey: createHash("sha256").update(`${input.teamId}:${workspaceRoot}`).digest("hex").slice(0, 24), browserProfileRoot, evidenceRoot, loopbackPort: input.loopbackPort, parallelExecutionEnabled: false, createdAt: input.createdAt ?? new Date().toISOString() };
}

export function assertTeamResource(runtime: CompetitionTeamRuntime, resourcePath: string, kind: "workspace" | "browser" | "evidence") {
  const candidate = absolute("resourcePath", resourcePath);
  const root = kind === "workspace" ? runtime.workspaceRoot : kind === "browser" ? runtime.browserProfileRoot : runtime.evidenceRoot;
  if (!isWithin(root, candidate)) throw new Error(`The requested ${kind} resource is outside Team ${runtime.teamId}'s isolated root.`);
  return candidate;
}

export function assertTeamPort(runtime: CompetitionTeamRuntime, port: number) {
  if (port !== runtime.loopbackPort) throw new Error(`Port ${port} is not assigned to Team ${runtime.teamId}.`);
  return port;
}

export function competitionIsolationStatus() {
  return { enabled: false as const, parallelExecutionEnabled: false as const, reason: "Parallel competition execution remains disabled until isolated workspace, process, browser, evidence, and cross-team access tests are enabled together." };
}

export function teamRuntimePaths(configHome: string, teamId: string) {
  assertTeamId(teamId);
  const root = join(absolute("configHome", configHome), "team-runtimes", teamId);
  return { workspaceRoot: join(root, "workspace"), browserProfileRoot: join(root, "browser"), evidenceRoot: join(root, "evidence") };
}

export async function persistCompetitionTeamRuntime(runtime: CompetitionTeamRuntime, registryDirectory: string) {
  const directory = absolute("registryDirectory", registryDirectory);
  await Promise.all([mkdir(directory, { recursive: true, mode: 0o700 }), mkdir(runtime.workspaceRoot, { recursive: true, mode: 0o700 }), mkdir(runtime.browserProfileRoot, { recursive: true, mode: 0o700 }), mkdir(runtime.evidenceRoot, { recursive: true, mode: 0o700 })]);
  const path = join(directory, `${runtime.teamId}.json`);
  await writeFile(path, `${JSON.stringify(runtime, null, 2)}\n`, { mode: 0o600 });
  return path;
}

export async function loadCompetitionTeamRuntime(teamId: string, registryDirectory: string) {
  assertTeamId(teamId);
  const path = join(absolute("registryDirectory", registryDirectory), `${teamId}.json`);
  return createCompetitionTeamRuntime(JSON.parse(await readFile(path, "utf8")) as CompetitionTeamRuntime);
}

export async function registerCompetitionTeamRuntime(runtime: CompetitionTeamRuntime, registryDirectory: string) {
  const directory = absolute("registryDirectory", registryDirectory);
  const indexPath = join(directory, "index.json");
  const existing = JSON.parse(await readFile(indexPath, "utf8").catch(() => "[]")) as string[];
  for (const teamId of existing) {
    if (teamId === runtime.teamId) continue;
    try {
      if ((await loadCompetitionTeamRuntime(teamId, directory)).loopbackPort === runtime.loopbackPort) throw new Error(`Loopback port ${runtime.loopbackPort} is already assigned to another competition team.`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already assigned")) throw error;
    }
  }
  const path = await persistCompetitionTeamRuntime(runtime, directory);
  await writeFile(indexPath, `${JSON.stringify(Array.from(new Set([...existing, runtime.teamId])), null, 2)}\n`, { mode: 0o600 });
  return path;
}

export async function listCompetitionTeamRuntimes(registryDirectory: string): Promise<CompetitionTeamSummary[]> {
  const directory = absolute("registryDirectory", registryDirectory);
  const teamIds = JSON.parse(await readFile(join(directory, "index.json"), "utf8").catch(() => "[]")) as string[];
  const results: CompetitionTeamSummary[] = [];
  for (const teamId of teamIds) {
    try {
      const runtime = await loadCompetitionTeamRuntime(teamId, directory);
      results.push({ teamId: runtime.teamId, loopbackPort: runtime.loopbackPort, parallelExecutionEnabled: false, createdAt: runtime.createdAt });
    } catch {
      // An incomplete local manifest is never exposed as an active team.
    }
  }
  return results;
}
