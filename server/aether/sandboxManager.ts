import { execFile as execFileCallback, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { addActivity, appendSandboxProcessOutput, finishSandboxProcess, getEmployeeSandbox, getSandboxProcess, setEmployeeSandboxStatus, startSandboxProcess } from "./state";
import { requireContainerRuntime, type ContainerRuntimeStatus } from "./sandboxRuntime";
import type { EmployeeId } from "../../shared/aether";

const execFile = promisify(execFileCallback);
const SANDBOX_IMAGE = "aetheroffice/employee-sandbox:1.0.0";
const MAX_COMMAND_OUTPUT = 64_000;
const activeCommands = new Map<string, ReturnType<typeof spawn>>();
const activeCommandBySandbox = new Map<string, string>();

type ReadyRuntime = Extract<ContainerRuntimeStatus, { available: true }>;

function packageSandboxDirectory() {
  return process.env.AETHER_SANDBOX_IMAGE_PATH || resolve(process.cwd(), "sandbox");
}

async function runRuntime(runtime: ReadyRuntime, args: string[]) {
  const result = await execFile(runtime.executable, args, { timeout: 90_000, windowsHide: true, maxBuffer: 256 * 1024 });
  return { stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

function runtimeFailure(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "Container runtime command failed.";
}

export function createSandboxContainerArgs(input: { containerName: string; volumeName: string }) {
  return [
    "container", "run", "--detach",
    "--name", input.containerName,
    "--network", "none",
    "--read-only",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges:true",
    "--pids-limit", "64",
    "--memory", "512m",
    "--cpus", "1.0",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=128m",
    "--volume", `${input.volumeName}:/workspace:rw`,
    "--workdir", "/workspace",
    "--user", "10001:10001",
    SANDBOX_IMAGE,
  ];
}

function assertTerminalInput(command: string, args: string[]) {
  if (!command.trim() || command.length > 160) throw new Error("A sandbox command must be a non-empty bounded executable name.");
  if (args.length > 30 || args.some((arg) => arg.length > 1_000 || /[\r\n\0]/.test(arg))) throw new Error("Sandbox command arguments are invalid.");
}

async function ensureSandboxImage(runtime: ReadyRuntime) {
  try {
    await runRuntime(runtime, ["image", "inspect", SANDBOX_IMAGE]);
    return;
  } catch {
    const directory = packageSandboxDirectory();
    if (!existsSync(directory)) throw new Error("The packaged AetherOffice sandbox image definition is unavailable. Reinstall @aetheroffice/cli.");
    await runRuntime(runtime, ["build", "--tag", SANDBOX_IMAGE, directory]);
  }
}

async function inspectContainer(runtime: ReadyRuntime, containerName: string) {
  try {
    const { stdout } = await runRuntime(runtime, ["container", "inspect", "--format", "{{.State.Status}}", containerName]);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function ensureContainerRunning(employee: EmployeeId) {
  const runtime = await requireContainerRuntime();
  const sandbox = getEmployeeSandbox(employee);
  try {
    await ensureSandboxImage(runtime);
    const status = await inspectContainer(runtime, sandbox.containerName);
    if (!status) await runRuntime(runtime, createSandboxContainerArgs(sandbox));
    else if (status !== "running") await runRuntime(runtime, ["container", "start", sandbox.containerName]);
    setEmployeeSandboxStatus(employee, "running", `${runtime.kind} container active with network disabled.`);
    addActivity({ kind: "sandbox", employee, message: `${employee} sandbox is running in a local ${runtime.kind} container.` });
    return { runtime, sandbox: getEmployeeSandbox(employee) };
  } catch (error) {
    setEmployeeSandboxStatus(employee, "error", runtimeFailure(error));
    throw error;
  }
}

export async function startEmployeeSandbox(employee: EmployeeId) {
  return ensureContainerRunning(employee);
}

export async function stopEmployeeSandbox(employee: EmployeeId, reason = "Owner stopped the employee sandbox.") {
  const runtime = await requireContainerRuntime();
  const sandbox = getEmployeeSandbox(employee);
  const status = await inspectContainer(runtime, sandbox.containerName);
  if (status === "running") await runRuntime(runtime, ["container", "stop", "--time", "5", sandbox.containerName]);
  const activeId = activeCommandBySandbox.get(sandbox.id);
  if (activeId) {
    activeCommands.get(activeId)?.kill("SIGTERM");
    finishSandboxProcess(activeId, { status: "cancelled", exitCode: null });
    activeCommands.delete(activeId);
    activeCommandBySandbox.delete(sandbox.id);
  }
  setEmployeeSandboxStatus(employee, "stopped", reason);
  addActivity({ kind: "sandbox", employee, message: `${employee} sandbox stopped.` });
  return getEmployeeSandbox(employee);
}

export async function restartEmployeeSandbox(employee: EmployeeId) {
  await stopEmployeeSandbox(employee, "Owner requested sandbox restart.");
  return startEmployeeSandbox(employee);
}

export async function destroyEmployeeSandbox(employee: EmployeeId, ownerConfirmed: boolean) {
  if (!ownerConfirmed) throw new Error("Destroying an employee sandbox requires explicit owner confirmation.");
  const runtime = await requireContainerRuntime();
  const sandbox = getEmployeeSandbox(employee);
  await runRuntime(runtime, ["container", "rm", "--force", sandbox.containerName]).catch(() => undefined);
  await runRuntime(runtime, ["volume", "rm", "--force", sandbox.volumeName]).catch(() => undefined);
  setEmployeeSandboxStatus(employee, "stopped", "Sandbox container and persistent workspace volume were destroyed by the owner.");
  addActivity({ kind: "sandbox", employee, message: `${employee} sandbox and persistent workspace were destroyed by the owner.` });
  return getEmployeeSandbox(employee);
}

export async function runEmployeeSandboxCommand(input: { employee: EmployeeId; command: string; args: string[] }) {
  assertTerminalInput(input.command, input.args);
  const { runtime, sandbox } = await ensureContainerRunning(input.employee);
  if (activeCommandBySandbox.has(sandbox.id)) throw new Error("This employee already has a running sandbox command. Stop it before starting another command.");
  const process = startSandboxProcess({ employeeId: input.employee, sandboxId: sandbox.id, command: input.command, args: input.args });
  const child = spawn(runtime.executable, ["container", "exec", "--workdir", "/workspace", "--user", "10001:10001", sandbox.containerName, input.command, ...input.args], { shell: false, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  activeCommands.set(process.id, child);
  activeCommandBySandbox.set(sandbox.id, process.id);
  addActivity({ kind: "terminal", employee: input.employee, message: `${input.employee} started a real sandbox command: ${input.command}.` });
  child.stdout.on("data", (chunk: Buffer) => appendSandboxProcessOutput(process.id, "stdout", chunk.toString("utf8").slice(0, MAX_COMMAND_OUTPUT)));
  child.stderr.on("data", (chunk: Buffer) => appendSandboxProcessOutput(process.id, "stderr", chunk.toString("utf8").slice(0, MAX_COMMAND_OUTPUT)));
  child.on("error", (error) => appendSandboxProcessOutput(process.id, "stderr", error.message));
  child.on("close", (exitCode) => {
    activeCommands.delete(process.id);
    activeCommandBySandbox.delete(sandbox.id);
    const status = exitCode === 0 ? "completed" : "failed";
    finishSandboxProcess(process.id, { status, exitCode });
    addActivity({ kind: "terminal", employee: input.employee, message: `${input.employee} sandbox command ${status}.` });
  });
  return process;
}

export async function stopEmployeeSandboxProcess(employee: EmployeeId, processId: string, ownerConfirmed: boolean) {
  if (!ownerConfirmed) throw new Error("Stopping an employee sandbox process requires explicit owner confirmation.");
  const process = getSandboxProcess(processId);
  const sandbox = getEmployeeSandbox(employee);
  if (!process || process.employeeId !== employee || process.sandboxId !== sandbox.id) throw new Error("Sandbox process not found for this employee.");
  if (process.status !== "running") return process;
  await stopEmployeeSandbox(employee, "Owner terminated the active sandbox process by stopping its isolated container.");
  return getSandboxProcess(processId);
}
