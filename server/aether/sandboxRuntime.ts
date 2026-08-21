import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export type ContainerRuntimeKind = "docker" | "podman";

export type ContainerRuntimeStatus =
  | { available: true; kind: ContainerRuntimeKind; executable: string; version: string; serverVersion: string }
  | { available: false; reason: "not-installed" | "daemon-unavailable"; detail: string };

export type RuntimeCommand = (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

async function executeRuntimeCommand(command: string, args: string[]) {
  const result = await execFile(command, args, { timeout: 5_000, windowsHide: true, maxBuffer: 64 * 1024 });
  return { stdout: result.stdout, stderr: result.stderr };
}

function errorDetail(error: unknown) {
  if (!(error instanceof Error)) return "Unknown runtime error.";
  const code = "code" in error ? String(error.code ?? "") : "";
  if (code === "ENOENT") return "The executable was not found.";
  return error.message.slice(0, 300) || "The runtime did not respond.";
}

export async function detectContainerRuntime(run: RuntimeCommand = executeRuntimeCommand): Promise<ContainerRuntimeStatus> {
  let foundExecutable = false;
  let daemonDetail = "No supported local container runtime responded.";

  for (const kind of ["docker", "podman"] as const) {
    try {
      const version = (await run(kind, ["--version"])).stdout.trim();
      foundExecutable = true;
      try {
        const serverVersion = (await run(kind, ["info", "--format", "{{.ServerVersion}}"])).stdout.trim();
        if (!serverVersion) throw new Error("The local runtime returned no server version.");
        return { available: true, kind, executable: kind, version, serverVersion };
      } catch (error) {
        daemonDetail = `${kind} is installed but unavailable: ${errorDetail(error)}`;
      }
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") daemonDetail = `${kind} could not be checked: ${errorDetail(error)}`;
    }
  }

  return foundExecutable
    ? { available: false, reason: "daemon-unavailable", detail: daemonDetail }
    : { available: false, reason: "not-installed", detail: "Docker Desktop or Podman was not found on this computer." };
}

export function containerRuntimeSetupMessage(platform = process.platform) {
  const primary = platform === "linux"
    ? "Install Docker Engine or Podman, start its service, then run AetherOffice again."
    : "Install and start Docker Desktop or Podman, then run AetherOffice again.";
  return `${primary} Employee rooms will remain visible, but no terminal command can run until a local isolated runtime is ready. AetherOffice never falls back to host command execution.`;
}

export async function requireContainerRuntime(run: RuntimeCommand = executeRuntimeCommand) {
  const runtime = await detectContainerRuntime(run);
  if (!runtime.available) throw new Error(`${runtime.detail} ${containerRuntimeSetupMessage()}`);
  return runtime;
}
