#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ownDirectory = dirname(fileURLToPath(import.meta.url));
const localSecretsFile = join(ownDirectory, "..", ".env.local");
const officeCli = join(ownDirectory, "aether-office.mjs");
const nodeArguments = existsSync(localSecretsFile)
  ? [`--env-file=${localSecretsFile}`, officeCli, ...process.argv.slice(2)]
  : [officeCli, ...process.argv.slice(2)];
const child = spawn(process.execPath, nodeArguments, { stdio: "inherit" });

child.on("exit", (code) => process.exit(code ?? 0));
