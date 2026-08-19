import { createHash, randomUUID } from "node:crypto";
import { appendFile, lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ControlledTool, EmployeeId } from "../../shared/aether";
import { addActivity } from "./state";

const execFileAsync = promisify(execFile);
const MAX_FILE_BYTES = 1_000_000;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
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

let workspaceRoot: string | null = process.env.AETHER_WORKSPACE ? resolve(process.env.AETHER_WORKSPACE) : null;

function getAuditPath(root: string) {
  const key = createHash("sha256").update(root).digest("hex").slice(0, 16);
  return join(process.env.AETHER_CONFIG_HOME || join(homedir(), ".aether-office"), "audit", `${key}.ndjson`);
}

function requireWorkspace() {
  if (!workspaceRoot) throw new Error("No workspace is selected. Choose a project directory first.");
  return workspaceRoot;
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
  return withAudit({ who, what: "run_command", file: command, why }, async () => {
    const root = requireWorkspace();
    const allowed = new Set(["npm", "pnpm", "yarn", "bun", "python", "python3", "pytest"]);
    if (!allowed.has(command)) throw new Error("This command is not allowed by the controlled execution policy.");
    if (args.some((arg) => arg.includes(";") || arg.includes("&&") || arg.includes("|") || arg.includes("`"))) throw new Error("Shell control characters are not allowed in controlled command arguments.");
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: root, timeout: 120_000, maxBuffer: 2_000_000 });
    return { stdout, stderr };
  });
}

export async function runWorkspaceTests(who: AuditRecord["WHO"], why: string) {
  return withAudit({ who, what: "run_tests", file: "workspace", why }, async () => {
    const root = requireWorkspace();
    const packagePath = join(root, "package.json");
    try {
      await stat(packagePath);
      const packageManager = await stat(join(root, "pnpm-lock.yaml")).then(() => "pnpm").catch(() => "npm");
      const { stdout, stderr } = await execFileAsync(packageManager, [packageManager === "pnpm" ? "test" : "test"], { cwd: root, timeout: 120_000, maxBuffer: 2_000_000 });
      return { command: `${packageManager} test`, stdout, stderr };
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") throw new Error("No supported package test script was found in the workspace.");
      throw error;
    }
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
