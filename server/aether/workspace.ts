import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright-core";
import type { ControlledTool, EmployeeId } from "../../shared/aether";
import { addActivity, getEmployeeCurrentWork } from "./state";

const execFileAsync = promisify(execFile);
const MAX_FILE_BYTES = 1_000_000;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_EXECUTION_OUTPUT_BYTES = 2_000_000;
const MAX_EXECUTION_HISTORY = 20;
const ALLOWED_WORKSPACE_COMMANDS = new Set(["npm", "pnpm", "yarn", "bun", "python", "python3", "pytest"]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".txt", ".md", ".csv", ".json", ".zip", ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go", ".rs", ".html", ".css", ".scss", ".yml", ".yaml"]);

export type AuditRecord = {
  WHO: EmployeeId | "Owner" | "System";
  WHAT: ControlledTool;
  "WHICH FILE": string;
  WHEN: string;
  WHY: string;
  result: "success" | "blocked" | "error";
};

export type WorkspaceSummary = {
  root: string | null;
  selected: boolean;
  gitAvailable: boolean;
};

export type WorkspaceExecution = {
  id: string;
  command: string;
  args: string[];
  status: "running" | "cancelling" | "completed" | "failed" | "cancelled";
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startedAt: string;
  completedAt: string | null;
};

type ActiveExecution = {
  execution: WorkspaceExecution;
  child: ReturnType<typeof spawn>;
  tool: "run_command" | "run_tests";
  who: AuditRecord["WHO"];
  why: string;
  cancelled: boolean;
  timeout: ReturnType<typeof setTimeout>;
};

type CompletedExecution = Pick<ActiveExecution, "execution" | "tool" | "who">;

export type EmployeeInspectionSnapshot = {
  employee: EmployeeId;
  state: "IDLE" | "RUNNING_COMMAND" | "TESTING";
  safeTaskSummary: string;
  currentWork: string;
  startedAt: string | null;
  activeExecutions: WorkspaceExecution[];
  recentExecutions: WorkspaceExecution[];
  recentFiles: Array<{ path: string; tool: ControlledTool; when: string; result: AuditRecord["result"] }>;
  activity: Array<{ tool: ControlledTool; path: string; when: string; result: AuditRecord["result"] }>;
};

export type ProjectPreviewSnapshot = {
  selected: boolean;
  url: string | null;
  source: "configured" | "controlled-dev-server" | "unavailable";
  lastCommand: Pick<WorkspaceExecution, "command" | "args" | "status" | "startedAt" | "completedAt" | "stdout" | "stderr"> | null;
  lastTest: Pick<WorkspaceExecution, "command" | "args" | "status" | "startedAt" | "completedAt" | "stdout" | "stderr"> | null;
};

export type ProofReport = {
  id: string;
  createdAt: string;
  workspaceName: string;
  localReportDirectory: string;
  markdown: string;
  evidence: {
    gitStatus: string | null;
    gitDiff: string | null;
    tests: Array<ReturnType<typeof safeExecutionEvidence>>;
    audit: Array<Pick<AuditRecord, "WHO" | "WHAT" | "WHICH FILE" | "WHEN" | "result">>;
    screenshots: string[];
    browser: ProjectBrowserEvidence | null;
  };
};

export type ProjectBrowserEvidence = {
  id: string;
  scenario: BrowserTestScenarioId;
  createdAt: string;
  targetUrl: string;
  finalUrl: string | null;
  title: string | null;
  httpStatus: number | null;
  passed: boolean;
  console: Array<{ level: string; text: string }>;
  network: Array<{ method: string; status: number; url: string }>;
  errors: string[];
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  localScreenshotPath: string | null;
};

export const BROWSER_TEST_SCENARIOS = ["page-load", "responsive-capture", "safe-form-inspection"] as const;
export type BrowserTestScenarioId = typeof BROWSER_TEST_SCENARIOS[number];

const browserScenarioDetails: Record<BrowserTestScenarioId, { label: string; viewport: { width: number; height: number } }> = {
  "page-load": { label: "Page load and console/network evidence", viewport: { width: 1440, height: 900 } },
  "responsive-capture": { label: "Responsive mobile viewport capture", viewport: { width: 390, height: 844 } },
  "safe-form-inspection": { label: "Safe form inspection without typing or submission", viewport: { width: 1440, height: 900 } },
};

export type EvidenceGallerySnapshot = {
  reports: Array<{ id: string; createdAt: string; bytes: number }>;
  screenshots: Array<{ id: string; createdAt: string; bytes: number }>;
};

const activeExecutions = new Map<string, ActiveExecution>();
const completedExecutions = new Map<string, CompletedExecution>();
let configuredPreviewUrl: string | null = null;

let workspaceRoot: string | null = process.env.AETHER_WORKSPACE ? resolve(process.env.AETHER_WORKSPACE) : null;
let latestProofReport: ProofReport | null = null;
let latestBrowserEvidence: ProjectBrowserEvidence | null = null;

function getAuditPath(root: string) {
  const key = createHash("sha256").update(root).digest("hex").slice(0, 16);
  return join(process.env.AETHER_CONFIG_HOME || join(homedir(), ".aether-office"), "audit", `${key}.ndjson`);
}

function requireWorkspace() {
  if (!workspaceRoot) throw new Error("No workspace is selected. Choose a project directory first.");
  return workspaceRoot;
}

export function redactSensitiveOutput(value: string) {
  return value
    .replace(/\b(?:AIza[\w-]{20,}|sk-[\w-]{16,}|nvapi-[\w-]{16,}|xai-[\w-]{16,})\b/gi, "[REDACTED]")
    .replace(/\b((?:api[_ -]?key|token|secret|password)\s*[:=]\s*)[^\s"']+/gi, "$1[REDACTED]");
}

function safeExecutionEvidence(execution: WorkspaceExecution | null) {
  if (!execution) return null;
  return {
    command: execution.command,
    args: execution.args,
    status: execution.status,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
    stdout: redactSensitiveOutput(execution.stdout),
    stderr: redactSensitiveOutput(execution.stderr),
  };
}

function assertLoopbackPreviewUrl(rawUrl: string) {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { throw new Error("A local preview URL must be a valid absolute URL."); }
  if (parsed.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.port) {
    throw new Error("Only an explicit http://localhost, 127.0.0.1, or [::1] preview URL with a port is allowed.");
  }
  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  return parsed.toString();
}

function extractPreviewUrl(output: string) {
  const match = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d{2,5}(?:\/[^\s"']*)?/i);
  return match ? assertLoopbackPreviewUrl(match[0]) : null;
}

function reportDirectoryFor(root: string) {
  const key = createHash("sha256").update(root).digest("hex").slice(0, 16);
  return join(process.env.AETHER_CONFIG_HOME || join(homedir(), ".aether-office"), "reports", key);
}

function resolveEvidenceFile(root: string, folder: string, fileName: string, expectedExtension: ".md" | ".png") {
  if (!/^[a-z0-9][a-z0-9-]{4,120}$/i.test(fileName)) throw new Error("Invalid local evidence identifier.");
  const directory = join(reportDirectoryFor(root), folder);
  const candidate = resolve(directory, `${fileName}${expectedExtension}`);
  const nested = relative(directory, candidate);
  if (nested.startsWith("..") || isAbsolute(nested)) throw new Error("Evidence access is restricted to the selected workspace root.");
  return candidate;
}

function compactOutput(value: string) {
  return redactSensitiveOutput(value).slice(0, 20_000);
}

function safeBrowserEvidenceUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "[unavailable URL]";
  }
}

function findChromiumExecutable() {
  const candidates = [process.env.AETHER_CHROMIUM_PATH, "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function ensureInsideWorkspace(root: string, candidate: string) {
  const rel = relative(root, candidate);
  if (rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))) return;
  throw new Error("The requested path is outside the selected workspace.");
}

async function resolvedExistingPath(relativePath: string) {
  const root = requireWorkspace();
  const candidate = resolve(root, relativePath);
  ensureInsideWorkspace(root, candidate);
  const actual = await realpath(candidate);
  ensureInsideWorkspace(root, actual);
  return actual;
}

async function resolvedWritePath(relativePath: string) {
  const root = requireWorkspace();
  const candidate = resolve(root, relativePath);
  ensureInsideWorkspace(root, candidate);
  const parent = await realpath(dirname(candidate));
  ensureInsideWorkspace(root, parent);
  return candidate;
}

async function appendAudit(record: AuditRecord) {
  const root = requireWorkspace();
  const auditPath = getAuditPath(root);
  await mkdir(dirname(auditPath), { recursive: true, mode: 0o700 });
  await appendFile(auditPath, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
  const taskStage = record.WHAT === "run_tests" ? "Testing" : record.WHAT === "git_diff" || record.WHAT === "git_status" ? "Reviewing" : record.WHAT === "read_file" || record.WHAT === "list_directory" || record.WHAT === "search_files" ? "Inspecting" : "Building";
  const fileScope = record.WHAT === "run_tests" ? "Approved test target" : record.WHAT === "git_diff" || record.WHAT === "git_status" ? "Approved change set" : "Approved workspace file";
  addActivity({ kind: "tool", message: `${record.WHO} ran ${record.WHAT}: ${record.result}.`, employee: record.WHO === "Owner" || record.WHO === "System" ? undefined : record.WHO, camera: { fileScope, activeTool: record.WHAT, taskStage } });
}

export async function readAuditLog(limit = 100): Promise<AuditRecord[]> {
  const root = requireWorkspace();
  try {
    const raw = await readFile(getAuditPath(root), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-Math.min(Math.max(limit, 1), 500))
      .reverse()
      .map((line) => JSON.parse(line) as AuditRecord);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw new Error("Unable to read the local controlled-tool audit history.");
  }
}

async function withAudit<T>(input: { who: AuditRecord["WHO"]; what: ControlledTool; file: string; why: string }, action: () => Promise<T>) {
  try {
    const result = await action();
    await appendAudit({ WHO: input.who, WHAT: input.what, "WHICH FILE": input.file, WHEN: new Date().toISOString(), WHY: input.why, result: "success" });
    return result;
  } catch (error) {
    await appendAudit({ WHO: input.who, WHAT: input.what, "WHICH FILE": input.file, WHEN: new Date().toISOString(), WHY: input.why, result: error instanceof Error && error.message.includes("not allowed") ? "blocked" : "error" });
    throw error;
  }
}

export async function selectWorkspace(path: string) {
  const actual = await realpath(resolve(path));
  const details = await stat(actual);
  if (!details.isDirectory()) throw new Error("The selected workspace must be a directory.");
  workspaceRoot = actual;
  configuredPreviewUrl = null;
  latestBrowserEvidence = null;
  latestProofReport = null;
  addActivity({ kind: "workspace", message: "Owner selected a local project workspace." });
  return getWorkspaceSummary();
}

export async function getWorkspaceSummary(): Promise<WorkspaceSummary> {
  if (!workspaceRoot) return { root: null, selected: false, gitAvailable: false };
  try {
    await execFileAsync("git", ["-C", workspaceRoot, "rev-parse", "--is-inside-work-tree"], { timeout: 5000, maxBuffer: 64 * 1024 });
    return { root: workspaceRoot, selected: true, gitAvailable: true };
  } catch {
    return { root: workspaceRoot, selected: true, gitAvailable: false };
  }
}

export async function listDirectory(relativePath = ".", who: AuditRecord["WHO"] = "Owner", why = "Browse the selected workspace.") {
  return withAudit({ who, what: "list_directory", file: relativePath, why }, async () => {
    const path = await resolvedExistingPath(relativePath);
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.name !== ".git").map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" })).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  });
}

export type WorkspaceTreeEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: WorkspaceTreeEntry[];
};

export async function getWorkspaceTree(who: AuditRecord["WHO"] = "Owner", why = "Browse the selected workspace tree.") {
  return withAudit({ who, what: "list_directory", file: "workspace tree", why }, async () => {
    const root = requireWorkspace();
    let inspectedEntries = 0;
    const maximumDepth = 5;
    const maximumEntries = 500;
    const visit = async (directory: string, depth: number): Promise<WorkspaceTreeEntry[]> => {
      if (depth > maximumDepth || inspectedEntries >= maximumEntries) return [];
      const entries = await readdir(directory, { withFileTypes: true });
      const visibleEntries = entries.filter((entry) => entry.name !== ".git" && entry.name !== "node_modules" && entry.name !== ".aether-office").sort((a, b) => a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1);
      const tree: WorkspaceTreeEntry[] = [];
      for (const entry of visibleEntries) {
        if (inspectedEntries >= maximumEntries) break;
        inspectedEntries += 1;
        const fullPath = join(directory, entry.name);
        const path = relative(root, fullPath);
        if (entry.isDirectory()) tree.push({ name: entry.name, path, type: "directory", children: await visit(fullPath, depth + 1) });
        else if (entry.isFile()) tree.push({ name: entry.name, path, type: "file" });
      }
      return tree;
    };
    return visit(root, 0);
  });
}

export async function readWorkspaceFile(relativePath: string, who: AuditRecord["WHO"] = "Owner", why = "Inspect a workspace file.") {
  return withAudit({ who, what: "read_file", file: relativePath, why }, async () => {
    const path = await resolvedExistingPath(relativePath);
    const details = await stat(path);
    if (!details.isFile()) throw new Error("Only regular files can be read.");
    if (details.size > MAX_FILE_BYTES) throw new Error("The requested file is too large to read safely.");
    return { content: await readFile(path, "utf8"), size: details.size };
  });
}

export async function readWorkspaceImage(relativePath: string, who: AuditRecord["WHO"] = "Owner", why = "Inspect an uploaded visual reference.") {
  return withAudit({ who, what: "read_file", file: relativePath, why }, async () => {
    const extension = extname(relativePath).toLowerCase();
    const mimeTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
    const mimeType = mimeTypes[extension];
    if (!mimeType) throw new Error("Only supported image uploads can be sent to a vision-capable provider.");
    const path = await resolvedExistingPath(relativePath);
    const details = await stat(path);
    if (!details.isFile() || details.size > 10 * 1024 * 1024) throw new Error("The image file is not safe to inspect.");
    const bytes = await readFile(path);
    return { dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`, mimeType, size: details.size };
  });
}

export async function writeWorkspaceFile(relativePath: string, content: string, who: AuditRecord["WHO"], why: string) {
  return withAudit({ who, what: "write_file", file: relativePath, why }, async () => {
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error("Writing more than 1 MB in one controlled operation is not allowed.");
    const path = await resolvedWritePath(relativePath);
    await writeFile(path, content, "utf8");
    return { saved: true };
  });
}

export async function createWorkspaceFile(relativePath: string, content: string, who: AuditRecord["WHO"], why: string) {
  return withAudit({ who, what: "create_file", file: relativePath, why }, async () => {
    const path = await resolvedWritePath(relativePath);
    try { await lstat(path); throw new Error("The target file already exists."); } catch (error) { if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error; }
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new Error("Writing more than 1 MB in one controlled operation is not allowed.");
    await writeFile(path, content, { encoding: "utf8", flag: "wx" });
    return { created: true };
  });
}

export async function createWorkspaceDirectory(relativePath: string, who: AuditRecord["WHO"], why: string) {
  return withAudit({ who, what: "create_directory", file: relativePath, why }, async () => {
    const path = await resolvedWritePath(relativePath);
    await mkdir(path, { recursive: false });
    return { created: true };
  });
}

export async function editWorkspaceFile(relativePath: string, find: string, replace: string, who: AuditRecord["WHO"], why: string) {
  return withAudit({ who, what: "edit_file", file: relativePath, why }, async () => {
    if (!find) throw new Error("An exact non-empty source fragment is required for an edit.");
    const path = await resolvedExistingPath(relativePath);
    const current = await readFile(path, "utf8");
    const position = current.indexOf(find);
    if (position < 0) throw new Error("The requested source fragment was not found.");
    if (current.indexOf(find, position + find.length) >= 0) throw new Error("The requested source fragment is not unique.");
    await writeFile(path, current.replace(find, replace), "utf8");
    return { edited: true };
  });
}

export async function deleteWorkspaceFile(relativePath: string, who: AuditRecord["WHO"], why: string) {
  return withAudit({ who, what: "delete_file", file: relativePath, why }, async () => {
    const path = await resolvedExistingPath(relativePath);
    await rm(path, { recursive: false, force: false });
    return { deleted: true };
  });
}

export async function moveWorkspaceFile(from: string, to: string, who: AuditRecord["WHO"], why: string) {
  return withAudit({ who, what: "move_file", file: `${from} → ${to}`, why }, async () => {
    const source = await resolvedExistingPath(from);
    const destination = await resolvedWritePath(to);
    await rename(source, destination);
    return { moved: true };
  });
}

export async function searchWorkspaceFiles(query: string, who: AuditRecord["WHO"] = "Owner", why = "Search workspace file names.") {
  return withAudit({ who, what: "search_files", file: "workspace", why }, async () => {
    const root = requireWorkspace();
    const results: string[] = [];
    async function visit(directory: string) {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        const full = join(directory, entry.name);
        if (entry.isDirectory()) await visit(full);
        else if (entry.isFile() && entry.name.toLowerCase().includes(query.toLowerCase())) results.push(relative(root, full));
        if (results.length >= 100) return;
      }
    }
    if (query.trim().length < 2) throw new Error("Search text must contain at least two characters.");
    await visit(root);
    return results;
  });
}

async function runGit(args: string[], tool: "git_status" | "git_diff", who: AuditRecord["WHO"], why: string) {
  return withAudit({ who, what: tool, file: "Git workspace", why }, async () => {
    const root = requireWorkspace();
    const { stdout } = await execFileAsync("git", ["-C", root, ...args], { timeout: 10_000, maxBuffer: 2_000_000 });
    return stdout;
  });
}

export function getGitStatus(who: AuditRecord["WHO"] = "Owner", why = "Review current Git status.") {
  return runGit(["status", "--short", "--branch"], "git_status", who, why);
}

export function getGitDiff(who: AuditRecord["WHO"] = "Owner", why = "Review current Git diff.") {
  return runGit(["diff", "--no-ext-diff"], "git_diff", who, why);
}

export async function getGitHistory(who: AuditRecord["WHO"] = "Owner", why = "Review recent Git history.") {
  return withAudit({ who, what: "git_status", file: "Git history", why }, async () => {
    const root = requireWorkspace();
    const { stdout } = await execFileAsync("git", ["-C", root, "log", "--pretty=format:%H%x09%h%x09%s%x09%an%x09%aI", "-n", "30"], { timeout: 10_000, maxBuffer: 1_000_000 });
    return stdout.split("\n").filter(Boolean).map((line) => {
      const [hash, shortHash, subject, author, date] = line.split("\t");
      return { hash, shortHash, subject, author, date };
    });
  });
}

export async function createGitCommit(message: string, who: AuditRecord["WHO"], why: string, ownerConfirmed: boolean) {
  return withAudit({ who, what: "git_status", file: "Git workspace", why }, async () => {
    if (!ownerConfirmed) throw new Error("Creating a Git commit requires explicit owner confirmation.");
    const root = requireWorkspace();
    const { stdout } = await execFileAsync("git", ["-C", root, "commit", "-m", message], { timeout: 30_000, maxBuffer: 1_000_000 });
    return { output: stdout };
  });
}

export async function revertGitCommit(commit: string, who: AuditRecord["WHO"], why: string, ownerConfirmed: boolean) {
  return withAudit({ who, what: "git_status", file: `Git commit ${commit}`, why }, async () => {
    if (!ownerConfirmed) throw new Error("Reverting a Git commit requires explicit owner confirmation.");
    const root = requireWorkspace();
    const { stdout } = await execFileAsync("git", ["-C", root, "revert", "--no-edit", commit], { timeout: 30_000, maxBuffer: 1_000_000 });
    return { output: stdout };
  });
}

export async function runWorkspaceCommand(command: string, args: string[], who: AuditRecord["WHO"], why: string) {
  const execution = startWorkspaceCommand(command, args, who, why);
  return waitForWorkspaceExecution(execution.id);
}

export async function runWorkspaceTests(who: AuditRecord["WHO"], why: string) {
  const execution = await startWorkspaceTests(who, why);
  const result = await waitForWorkspaceExecution(execution.id);
  return { command: `${result.command} ${result.args.join(" ")}`.trim(), stdout: result.stdout, stderr: result.stderr };
}

function assertAllowedCommand(command: string, args: string[]) {
  if (!ALLOWED_WORKSPACE_COMMANDS.has(command)) throw new Error("This command is not allowed by the controlled execution policy.");
  if (args.some((arg) => arg.includes(";") || arg.includes("&&") || arg.includes("|") || arg.includes("`"))) throw new Error("Shell control characters are not allowed in controlled command arguments.");
}

function appendExecutionOutput(existing: string, chunk: Buffer) {
  if (existing.length >= MAX_EXECUTION_OUTPUT_BYTES) return existing;
  return `${existing}${chunk.toString("utf8").slice(0, MAX_EXECUTION_OUTPUT_BYTES - existing.length)}`;
}

function rememberCompletedExecution(execution: WorkspaceExecution, active: ActiveExecution) {
  completedExecutions.set(execution.id, { execution, who: active.who, tool: active.tool });
  while (completedExecutions.size > MAX_EXECUTION_HISTORY) {
    const first = completedExecutions.keys().next().value;
    if (first) completedExecutions.delete(first);
    else break;
  }
}

function launchWorkspaceExecution(input: { command: string; args: string[]; who: AuditRecord["WHO"]; why: string; tool: "run_command" | "run_tests" }) {
  assertAllowedCommand(input.command, input.args);
  const root = requireWorkspace();
  const id = randomUUID();
  const execution: WorkspaceExecution = { id, command: input.command, args: input.args, status: "running", stdout: "", stderr: "", exitCode: null, startedAt: new Date().toISOString(), completedAt: null };
  const child = spawn(input.command, input.args, { cwd: root, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  const timeout = setTimeout(() => {
    const active = activeExecutions.get(id);
    if (!active) return;
    active.cancelled = true;
    active.execution.status = "cancelling";
    active.execution.stderr = `${active.execution.stderr}\nExecution exceeded the 120-second limit and was cancelled.\n`;
    active.child.kill("SIGTERM");
  }, 120_000);
  timeout.unref();
  const active: ActiveExecution = { execution, child, tool: input.tool, who: input.who, why: input.why, cancelled: false, timeout };
  activeExecutions.set(id, active);
  child.stdout.on("data", (chunk: Buffer) => { execution.stdout = appendExecutionOutput(execution.stdout, chunk); });
  child.stderr.on("data", (chunk: Buffer) => { execution.stderr = appendExecutionOutput(execution.stderr, chunk); });
  child.on("error", (error) => { execution.stderr = appendExecutionOutput(execution.stderr, Buffer.from(error.message)); });
  child.on("close", (exitCode) => {
    clearTimeout(timeout);
    execution.exitCode = exitCode;
    execution.completedAt = new Date().toISOString();
    execution.status = active.cancelled ? "cancelled" : exitCode === 0 ? "completed" : "failed";
    activeExecutions.delete(id);
    rememberCompletedExecution(execution, active);
    void appendAudit({ WHO: input.who, WHAT: input.tool, "WHICH FILE": `${input.command} ${input.args.join(" ")}`.trim(), WHEN: execution.completedAt, WHY: input.why, result: execution.status === "completed" ? "success" : "error" });
  });
  return execution;
}

export function startWorkspaceCommand(command: string, args: string[], who: AuditRecord["WHO"], why: string) {
  return launchWorkspaceExecution({ command, args, who, why, tool: "run_command" });
}

export async function startWorkspaceTests(who: AuditRecord["WHO"], why: string) {
  const root = requireWorkspace();
  try {
    await stat(join(root, "package.json"));
    const packageManager = await stat(join(root, "pnpm-lock.yaml")).then(() => "pnpm").catch(() => "npm");
    return launchWorkspaceExecution({ command: packageManager, args: ["test"], who, why, tool: "run_tests" });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") throw new Error("No supported package test script was found in the workspace.");
    throw error;
  }
}

export function getWorkspaceExecution(id: string) {
  return activeExecutions.get(id)?.execution ?? completedExecutions.get(id)?.execution ?? null;
}

export function configureProjectPreview(url: string) {
  requireWorkspace();
  configuredPreviewUrl = assertLoopbackPreviewUrl(url);
  return getProjectPreview();
}

export function getProjectPreview(): ProjectPreviewSnapshot {
  const selected = Boolean(workspaceRoot);
  const executions = [
    ...Array.from(activeExecutions.values()).map((entry) => entry.execution),
    ...Array.from(completedExecutions.values()).map((entry) => entry.execution),
  ].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  const lastCommand = executions.find((execution) => !execution.args.includes("test")) ?? null;
  const lastTest = executions.find((execution) => execution.args.includes("test")) ?? null;
  const detectedUrl = configuredPreviewUrl ?? executions.map((execution) => extractPreviewUrl(`${execution.stdout}\n${execution.stderr}`)).find((url): url is string => Boolean(url)) ?? null;
  return {
    selected,
    url: detectedUrl,
    source: configuredPreviewUrl ? "configured" : detectedUrl ? "controlled-dev-server" : "unavailable",
    lastCommand: safeExecutionEvidence(lastCommand),
    lastTest: safeExecutionEvidence(lastTest),
  };
}

export function getLatestBrowserEvidence() {
  return latestBrowserEvidence;
}

export async function getEvidenceGallery(): Promise<EvidenceGallerySnapshot> {
  const root = requireWorkspace();
  const reportDirectory = reportDirectoryFor(root);
  const [reportEntries, screenshotEntries] = await Promise.all([
    readdir(reportDirectory, { withFileTypes: true }).catch(() => []),
    readdir(join(reportDirectory, "browser-evidence"), { withFileTypes: true }).catch(() => []),
  ]);
  const reports = (await Promise.all(reportEntries.filter((entry) => entry.isFile() && /^proof-[a-z0-9-]+\.md$/i.test(entry.name)).map(async (entry) => {
    const details = await stat(join(reportDirectory, entry.name));
    return { id: entry.name.replace(/\.md$/i, ""), createdAt: details.mtime.toISOString(), bytes: details.size };
  }))).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const screenshotDirectory = join(reportDirectory, "browser-evidence");
  const screenshots = (await Promise.all(screenshotEntries.filter((entry) => entry.isFile() && /^browser-[a-z0-9-]+\.png$/i.test(entry.name)).map(async (entry) => {
    const details = await stat(join(screenshotDirectory, entry.name));
    return { id: entry.name.replace(/\.png$/i, ""), createdAt: details.mtime.toISOString(), bytes: details.size };
  }))).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return { reports, screenshots };
}

export async function readEvidenceReport(id: string) {
  const root = requireWorkspace();
  if (!id.startsWith("proof-")) throw new Error("Only generated local proof reports can be opened.");
  const path = resolveEvidenceFile(root, ".", id, ".md");
  const details = await stat(path);
  if (details.size > 1_000_000) throw new Error("The selected proof report exceeds the local gallery size limit.");
  return { id, markdown: redactSensitiveOutput(await readFile(path, "utf8")) };
}

export async function readEvidenceScreenshot(id: string) {
  const root = requireWorkspace();
  if (!id.startsWith("browser-")) throw new Error("Only generated local browser screenshots can be opened.");
  const path = resolveEvidenceFile(root, "browser-evidence", id, ".png");
  const details = await stat(path);
  if (details.size > 8_000_000) throw new Error("The selected screenshot exceeds the local gallery size limit.");
  const image = await readFile(path);
  return { id, dataUrl: `data:image/png;base64,${image.toString("base64")}` };
}

export async function runProjectBrowserTest(scenario: BrowserTestScenarioId = "page-load"): Promise<ProjectBrowserEvidence> {
  const root = requireWorkspace();
  const preview = getProjectPreview();
  if (!preview.url) throw new Error("Configure a loopback project preview before running a browser test.");
  if (!BROWSER_TEST_SCENARIOS.includes(scenario)) throw new Error("The requested browser scenario is not approved.");
  const scenarioDetail = browserScenarioDetails[scenario];
  const executablePath = findChromiumExecutable();
  if (!executablePath) throw new Error("A local Chromium-compatible browser was not found. Set AETHER_CHROMIUM_PATH to enable controlled browser tests.");
  const createdAt = new Date().toISOString();
  const id = `browser-${scenario}-${createdAt.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const evidenceDirectory = join(reportDirectoryFor(root), "browser-evidence");
  const screenshotPath = join(evidenceDirectory, `${id}.png`);
  const console: ProjectBrowserEvidence["console"] = [];
  const network: ProjectBrowserEvidence["network"] = [];
  const errors: string[] = [];
  const checks: ProjectBrowserEvidence["checks"] = [];
  let finalUrl: string | null = null;
  let title: string | null = null;
  let httpStatus: number | null = null;
  let screenshotSaved = false;
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ viewport: scenarioDetail.viewport });
    page.on("console", (message) => {
      if (console.length < 100) console.push({ level: message.type(), text: compactOutput(message.text()).slice(0, 2_000) });
    });
    page.on("pageerror", (error) => { if (errors.length < 50) errors.push(compactOutput(error.message).slice(0, 2_000)); });
    page.on("response", (response) => {
      const request = response.request();
      const resourceType = request.resourceType();
      if (network.length < 150 && ["document", "script", "stylesheet", "xhr", "fetch"].includes(resourceType)) {
        network.push({ method: request.method(), status: response.status(), url: safeBrowserEvidenceUrl(response.url()) });
      }
    });
    const response = await page.goto(preview.url, { waitUntil: "networkidle", timeout: 15_000 });
    finalUrl = safeBrowserEvidenceUrl(page.url());
    title = compactOutput(await page.title()).slice(0, 300);
    httpStatus = response?.status() ?? null;
    checks.push({ name: "loopback page load", passed: Boolean(httpStatus && httpStatus >= 200 && httpStatus < 400), detail: `HTTP ${httpStatus ?? "unavailable"}` });
    if (scenario === "responsive-capture") checks.push({ name: "mobile viewport", passed: true, detail: `${scenarioDetail.viewport.width}×${scenarioDetail.viewport.height} capture` });
    if (scenario === "safe-form-inspection") {
      const formCount = await page.locator("form").count();
      checks.push({ name: "form observation", passed: true, detail: `${formCount} form(s) observed; no fields were typed and no submission control was activated.` });
    }
    await mkdir(evidenceDirectory, { recursive: true, mode: 0o700 });
    await page.screenshot({ path: screenshotPath, fullPage: true, type: "png" });
    screenshotSaved = true;
  } catch (error) {
    errors.push(compactOutput(error instanceof Error ? error.message : "Browser test failed.").slice(0, 2_000));
  } finally {
    await browser.close();
  }
  const evidence: ProjectBrowserEvidence = {
    id,
    scenario,
    createdAt,
    targetUrl: preview.url,
    finalUrl,
    title,
    httpStatus,
    passed: Boolean(httpStatus && httpStatus >= 200 && httpStatus < 400 && errors.length === 0 && screenshotSaved && checks.every((check) => check.passed)),
    console,
    network,
    errors,
    checks,
    localScreenshotPath: screenshotSaved ? screenshotPath : null,
  };
  latestBrowserEvidence = evidence;
  await appendAudit({ WHO: "Owner", WHAT: "run_tests", "WHICH FILE": `local browser ${scenario} test: ${safeBrowserEvidenceUrl(preview.url)}`, WHEN: createdAt, WHY: "Owner ran an approved local browser evidence test.", result: evidence.passed ? "success" : "error" });
  return evidence;
}

export function getLatestProofReport() {
  return latestProofReport;
}

export async function generateProofReport(): Promise<ProofReport> {
  const root = requireWorkspace();
  const createdAt = new Date().toISOString();
  const id = `proof-${createdAt.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const executions = [
    ...Array.from(activeExecutions.values()).map((entry) => entry.execution),
    ...Array.from(completedExecutions.values()).map((entry) => entry.execution),
  ].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  const tests = executions.filter((execution) => execution.args.includes("test")).slice(0, 5).map(safeExecutionEvidence);
  const audit = (await readAuditLog(100)).slice(0, 50).map((record) => ({ WHO: record.WHO, WHAT: record.WHAT, "WHICH FILE": redactSensitiveOutput(record["WHICH FILE"]), WHEN: record.WHEN, result: record.result }));
  let gitStatus: string | null = null;
  let gitDiff: string | null = null;
  try { gitStatus = compactOutput(await getGitStatus("Owner", "Collect local Git status for an owner-requested proof report.")); } catch { /* Non-Git workspaces have no Git evidence. */ }
  try { gitDiff = compactOutput(await getGitDiff("Owner", "Collect local Git diff for an owner-requested proof report.")); } catch { /* Non-Git workspaces have no Git evidence. */ }
  const browser = latestBrowserEvidence;
  const screenshots = browser?.localScreenshotPath ? [browser.localScreenshotPath] : [];
  const reportDirectory = reportDirectoryFor(root);
  const markdown = [
    "# AetherOffice Proof Report",
    "",
    `- **Report ID:** ${id}`,
    `- **Created:** ${createdAt}`,
    `- **Workspace:** ${basename(root)}`,
    "- **Evidence boundary:** local controlled execution, local Git inspection, and local audit events only.",
    "- **Excluded:** provider credentials, raw audit rationale, private prompts, unrestricted browser data, and fabricated screenshots.",
    "",
    "## Controlled Test Evidence",
    tests.length ? tests.map((test, index) => `### Test ${index + 1}\n\n\`\`\`text\n$ ${test?.command ?? ""} ${test?.args.join(" ") ?? ""}\nstatus: ${test?.status ?? ""}\n${test?.stdout ?? ""}${test?.stderr ? `\n${test.stderr}` : ""}\n\`\`\``).join("\n\n") : "No controlled test execution has been recorded.",
    "",
    "## Git Status",
    "```text",
    gitStatus || "No Git status is available for this workspace.",
    "```",
    "",
    "## Git Diff",
    "```diff",
    gitDiff || "No local Git diff is available for this workspace.",
    "```",
    "",
    "## Recent Controlled Audit Events",
    audit.length ? audit.map((record) => `- ${record.WHEN} · ${record.WHO} · ${record.WHAT} · ${record["WHICH FILE"]} · ${record.result}`).join("\n") : "No controlled audit events have been recorded.",
    "",
    "## Browser Evidence",
    browser ? [
      `- **Target:** ${browser.targetUrl}`,
      `- **Final URL:** ${browser.finalUrl ?? "unavailable"}`,
      `- **HTTP status:** ${browser.httpStatus ?? "unavailable"}`,
      `- **Result:** ${browser.passed ? "passed" : "failed"}`,
      `- **Console records:** ${browser.console.length}`,
      `- **Network records:** ${browser.network.length}`,
      `- **Captured errors:** ${browser.errors.length}`,
      `- **Screenshot:** ${browser.localScreenshotPath ?? "not captured"}`,
    ].join("\n") : "No controlled browser test has been recorded.",
    "",
    "## Screenshots",
    screenshots.length ? screenshots.map((path) => `- ${path}`).join("\n") : "No screenshots were captured by this report. AetherOffice does not claim visual proof unless an actual local screenshot capture is added to the evidence set.",
    "",
  ].join("\n");
  const report: ProofReport = { id, createdAt, workspaceName: basename(root), localReportDirectory: reportDirectory, markdown, evidence: { gitStatus, gitDiff, tests, audit, screenshots, browser } };
  await mkdir(reportDirectory, { recursive: true, mode: 0o700 });
  await writeFile(join(reportDirectory, `${id}.md`), markdown, { encoding: "utf8", mode: 0o600 });
  await writeFile(join(reportDirectory, `${id}.json`), `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  latestProofReport = report;
  await appendAudit({ WHO: "Owner", WHAT: "read_file", "WHICH FILE": "local proof report", WHEN: createdAt, WHY: "Owner generated a local evidence report.", result: "success" });
  return report;
}

export async function getEmployeeInspection(employee: EmployeeId): Promise<EmployeeInspectionSnapshot> {
  const audit = (await readAuditLog(250)).filter((record) => record.WHO === employee);
  const active = Array.from(activeExecutions.values()).filter((entry) => entry.who === employee).map((entry) => entry.execution);
  const completed = Array.from(completedExecutions.values()).filter((entry) => entry.who === employee).map((entry) => entry.execution).sort((left, right) => right.startedAt.localeCompare(left.startedAt)).slice(0, 10);
  const latest = active[0] ?? completed[0] ?? null;
  const state = active.some((execution) => execution.command === "pnpm" && execution.args.includes("test")) ? "TESTING" : active.length ? "RUNNING_COMMAND" : "IDLE";
  const currentWork = active.length ? `Currently running ${active[0].command} ${active[0].args.join(" ")}`.trim() : getEmployeeCurrentWork(employee);
  const safeTaskSummary = currentWork;
  const activity = audit.slice(0, 30).map((record) => ({ tool: record.WHAT, path: record["WHICH FILE"], when: record.WHEN, result: record.result }));
  const recentFiles = audit.filter((record) => record.WHAT !== "run_command" && record.WHAT !== "run_tests").slice(0, 20).map((record) => ({ path: record["WHICH FILE"], tool: record.WHAT, when: record.WHEN, result: record.result }));
  return { employee, state, safeTaskSummary, currentWork, startedAt: latest?.startedAt ?? null, activeExecutions: active, recentExecutions: completed, recentFiles, activity };
}

export async function cancelWorkspaceExecution(id: string, who: AuditRecord["WHO"], why: string) {
  const active = activeExecutions.get(id);
  if (!active) return { cancelled: false, execution: getWorkspaceExecution(id) };
  active.cancelled = true;
  active.execution.status = "cancelling";
  active.child.kill("SIGTERM");
  setTimeout(() => { if (activeExecutions.has(id)) active.child.kill("SIGKILL"); }, 1_500).unref();
  await appendAudit({ WHO: who, WHAT: active.tool, "WHICH FILE": active.execution.command, WHEN: new Date().toISOString(), WHY: why, result: "success" });
  return { cancelled: true, execution: active.execution };
}

async function waitForWorkspaceExecution(id: string): Promise<WorkspaceExecution> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const execution = getWorkspaceExecution(id);
      if (!execution) { clearInterval(interval); reject(new Error("The controlled execution record was unavailable.")); return; }
      if (execution.status === "running" || execution.status === "cancelling") return;
      clearInterval(interval);
      resolve(execution);
    }, 50);
    interval.unref();
  });
}

export async function importWorkspaceUpload(input: { fileName: string; mimeType: string; base64: string; who: AuditRecord["WHO"]; why: string }) {
  return withAudit({ who: input.who, what: "create_file", file: input.fileName, why: input.why }, async () => {
    const extension = extname(input.fileName).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) throw new Error("This file type is not allowed for workspace upload.");
    const bytes = Buffer.from(input.base64, "base64");
    if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new Error("Uploaded file size is outside the permitted range.");
    const root = requireWorkspace();
    const uploadDirectory = join(root, ".aether-office", "uploads");
    await mkdir(uploadDirectory, { recursive: true });
    const safeName = `${Date.now()}-${randomUUID()}-${basename(input.fileName).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const target = join(uploadDirectory, safeName);
    await writeFile(target, bytes, { flag: "wx" });
    return { relativePath: relative(root, target), mimeType: input.mimeType, size: bytes.length };
  });
}
