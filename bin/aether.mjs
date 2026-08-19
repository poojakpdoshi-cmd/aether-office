#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const ownDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(ownDirectory, "..");
const usage = `AetherOffice — Your AI Software Company

Usage:
  aether             Open AetherOffice for the current directory
  aether .           Open the current directory as the workspace
  aether <path>      Open a specific directory as the workspace
  aether --help      Show this help message
`;

const argument = process.argv[2];
if (argument === "--help" || argument === "-h") {
  process.stdout.write(usage);
  process.exit(0);
}

const workspace = resolve(argument || ".");
if (!existsSync(workspace) || !statSync(workspace).isDirectory()) {
  process.stderr.write("AetherOffice can only open an existing project directory.\n");
  process.exit(1);
}

const entry = join(packageRoot, "dist", "index.js");
if (!existsSync(entry)) {
  process.stderr.write("AetherOffice is not built. Run npm run build before using the installed CLI package.\n");
  process.exit(1);
}

const child = spawn(process.execPath, [entry], {
  cwd: packageRoot,
  env: { ...process.env, NODE_ENV: "production", AETHER_LOCAL_ONLY: "true", AETHER_WORKSPACE: workspace, PORT: process.env.PORT || "4173" },
  stdio: ["inherit", "pipe", "pipe"],
});

let opened = false;
const openBrowser = (url) => {
  if (opened || process.env.AETHER_NO_BROWSER === "1") return;
  opened = true;
  const command = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  spawn(command[0], command[1], { detached: true, stdio: "ignore" }).unref();
};

child.stdout.on("data", (chunk) => {
  const text = String(chunk);
  process.stdout.write(text);
  const match = text.match(/Server running on (http:\/\/localhost:\d+\/)$/m);
  if (match) openBrowser(match[1]);
});
child.stderr.on("data", (chunk) => process.stderr.write(chunk));
child.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
