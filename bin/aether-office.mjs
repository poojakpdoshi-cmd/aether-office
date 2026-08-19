#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { existsSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ownDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(ownDirectory, "..");
const packageManifest = join(packageRoot, "package.json");
const serverEntry = join(packageRoot, "dist", "index.js");
const cliConfigEntry = join(packageRoot, "dist", "cli-config.js");

const usage = `AetherOffice — local-first AI software company

Usage:
  AetherOffice [workspace]    Configure if needed, then open a local workspace
  AetherOffice setup          Configure encrypted local AI provider credentials
  AetherOffice doctor         Diagnose the installed package and local setup safely
  AetherOffice --help         Show this help message
  AetherOffice --version      Show the installed package version

The application starts only on 127.0.0.1. API keys remain in the local encrypted vault and are never printed by this CLI.
`;

export function parseCommand(argumentsList) {
  const [first, ...rest] = argumentsList;
  if (!first) return { type: "start", workspace: "." };
  if (first === "--help" || first === "-h") return { type: "help" };
  if (first === "--version" || first === "-v") return { type: "version" };
  if (first === "setup" && rest.length === 0) return { type: "setup" };
  if (first === "doctor" && rest.length === 0) return { type: "doctor" };
  if (first.startsWith("-")) return { type: "invalid", message: `Unknown command: ${first}` };
  if (rest.length > 0) return { type: "invalid", message: "AetherOffice accepts one workspace path only." };
  return { type: "start", workspace: first };
}

function requireInstalledBundle() {
  if (!existsSync(serverEntry) || !existsSync(cliConfigEntry)) {
    throw new Error("The AetherOffice installation is incomplete. Reinstall the package with npm install --global <package-name>.");
  }
}

async function loadCliConfig() {
  requireInstalledBundle();
  return import(pathToFileURL(cliConfigEntry).href);
}

async function readPackageVersion() {
  const manifest = await import(pathToFileURL(packageManifest).href, { with: { type: "json" } });
  return manifest.default.version;
}

async function promptVisible(question) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await terminal.question(question)).trim();
  } finally {
    terminal.close();
  }
}

async function promptSecret(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Secure terminal input is unavailable in this session. Run AetherOffice setup from an interactive terminal or use the physical Provider Locker after local launch.");
  }

  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolveSecret, rejectSecret) => {
    let value = "";
    const finish = (error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (error) rejectSecret(error);
      else resolveSecret(value.trim());
    };
    const onData = (buffer) => {
      const text = buffer.toString("utf8");
      if (text === "\u0003") return finish(new Error("Setup cancelled."));
      if (text === "\r" || text === "\n") return finish();
      if (text === "\u007f" || text === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (!text.includes("\u001b")) value += text;
    };
    process.stdin.on("data", onData);
  });
}

function parseSelections(value, options) {
  const selection = [...new Set(value.split(",").map((item) => Number.parseInt(item.trim(), 10)).filter((item) => Number.isInteger(item) && item > 0 && item <= options.length))];
  if (selection.length === 0) throw new Error("Select at least one listed provider number.");
  return selection.map((index) => options[index - 1]);
}

async function runSetup() {
  const cli = await loadCliConfig();
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("AetherOffice setup requires an interactive terminal so credentials can be entered safely.");
  }

  const options = cli.getCliProviderOptions();
  process.stdout.write("\nWelcome to AetherOffice\n\nFirst-time setup stores only the providers you choose in your local encrypted vault. Provider keys are not printed or sent to the browser.\n\n");
  options.forEach((option, index) => process.stdout.write(`  ${index + 1}. ${option.label} (${option.secretName})\n`));
  const chosen = parseSelections(await promptVisible("\nChoose one or more provider numbers, separated by commas: "), options);

  for (const option of chosen) {
    process.stdout.write(`\nConfiguring ${option.label}.\n`);
    if (option.requiresCompatibilityAcknowledgement) {
      const acknowledged = await promptVisible("This model is retired and may no longer be served by Mistral. Type I UNDERSTAND to continue: ");
      if (acknowledged !== "I UNDERSTAND") throw new Error("Devstral Small 2 was not configured because the required acknowledgement was not given.");
    }

    const apiKey = await promptSecret(`Enter ${option.secretName}: `);
    if (!apiKey) throw new Error(`${option.secretName} cannot be empty.`);
    let baseUrl;
    let model;
    if (option.requiresEndpointAndModel) {
      baseUrl = await promptVisible("Enter the Arcee chat-completions endpoint: ");
      model = await promptVisible("Enter the Arcee model identifier: ");
    }
    await cli.configureCliProvider({
      provider: option.id,
      apiKey,
      ...(baseUrl ? { baseUrl } : {}),
      ...(model ? { model } : {}),
      ...(option.requiresCompatibilityAcknowledgement ? { compatibilityAcknowledged: true } : {}),
    });
    process.stdout.write(`✓ ${option.label} is encrypted in your local AetherOffice vault.\n`);

    const testNow = await promptVisible("Run an optional live connection check now? This may use provider quota. [y/N]: ");
    if (/^y(es)?$/i.test(testNow)) {
      const result = await cli.testCliProviderConfiguration(option.id);
      process.stdout.write(result.ok ? "✓ Provider connection confirmed.\n" : `! ${result.message}\n`);
    }
  }

  if (!(await cli.hasConfiguredExternalProvider())) {
    throw new Error("Setup completed without a usable external provider. Run AetherOffice setup again and configure at least one provider.");
  }
  process.stdout.write("\n✓ Local configuration validated. Run AetherOffice to open your workspace.\n");
}

async function runDoctor() {
  const cli = await loadCliConfig();
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] || "0", 10);
  const configHome = process.env.AETHER_CONFIG_HOME || join(homedir(), ".aether-office");
  const preferredPort = Number.parseInt(process.env.PORT || "4173", 10);
  const canBindPreferredPort = await new Promise((resolvePort) => {
    const probe = createServer();
    probe.once("error", () => resolvePort(false));
    probe.listen({ host: "127.0.0.1", port: preferredPort }, () => probe.close(() => resolvePort(true)));
  });
  const checks = [
    ["Node.js 22 or newer", nodeMajor >= 22, nodeMajor >= 22 ? process.versions.node : `found ${process.versions.node}`],
    ["Compiled application bundle", existsSync(serverEntry), serverEntry],
    ["Compiled setup bridge", existsSync(cliConfigEntry), cliConfigEntry],
    ["Local configuration directory", existsSync(configHome), configHome],
    ["At least one external provider", await cli.hasConfiguredExternalProvider(), "run AetherOffice setup if needed"],
    ["Preferred loopback port", canBindPreferredPort, canBindPreferredPort ? `127.0.0.1:${preferredPort}` : `127.0.0.1:${preferredPort} is in use; startup will seek the next available port`],
  ];
  process.stdout.write("AetherOffice doctor\n\n");
  checks.forEach(([label, passed, detail]) => process.stdout.write(`${passed ? "✓" : "!"} ${label}: ${detail}\n`));
  process.stdout.write("\nDoctor never reads or prints provider key values.\n");
  if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
}

function openBrowser(url) {
  if (process.env.AETHER_NO_BROWSER === "1") return;
  const command = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  const opener = spawn(command[0], command[1], { detached: true, stdio: "ignore" });
  opener.on("error", () => process.stdout.write(`Open this URL in your browser: ${url}\n`));
  opener.unref();
}

async function startWorkspace(rawWorkspace) {
  const workspace = resolve(rawWorkspace);
  if (!existsSync(workspace) || !statSync(workspace).isDirectory()) {
    throw new Error("AetherOffice can only open an existing project directory. Run AetherOffice /absolute/path/to/project.");
  }
  const cli = await loadCliConfig();
  if (!(await cli.hasConfiguredExternalProvider())) {
    process.stdout.write("First-time configuration is required before AetherOffice starts.\n");
    await runSetup();
  }

  process.stdout.write("\nAetherOffice is starting locally...\n✓ Configuration loaded\n");
  const child = spawn(process.execPath, [serverEntry], {
    cwd: packageRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      AETHER_LOCAL_ONLY: "true",
      AETHER_WORKSPACE: workspace,
      PORT: process.env.PORT || "4173",
    },
    stdio: ["inherit", "pipe", "pipe"],
  });
  let opened = false;
  child.stdout.on("data", (chunk) => {
    const text = String(chunk);
    process.stdout.write(text);
    const match = text.match(/Server running on (http:\/\/localhost:\d+\/?)/m);
    if (match && !opened) {
      opened = true;
      process.stdout.write(`✓ Backend and local web interface started at ${match[1]}\n`);
      openBrowser(match[1]);
    }
  });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

export async function main(argumentsList = process.argv.slice(2)) {
  const command = parseCommand(argumentsList);
  if (command.type === "help") return process.stdout.write(usage);
  if (command.type === "version") return process.stdout.write(`${await readPackageVersion()}\n`);
  if (command.type === "invalid") throw new Error(`${command.message}\n\n${usage}`);
  if (command.type === "setup") return runSetup();
  if (command.type === "doctor") return runDoctor();
  return startWorkspace(command.workspace);
}

const invokedPath = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : undefined;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`AetherOffice: ${error instanceof Error ? error.message : "Unexpected error."}\n`);
    process.exit(1);
  });
}
