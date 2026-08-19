import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const executable = resolve(process.argv[2] || "");
if (!executable) throw new Error("Pass the installed AetherOffice executable path.");

const configHome = await mkdtemp(join(tmpdir(), "aether-packaged-config-"));
const workspace = await mkdtemp(join(tmpdir(), "aether-packaged-workspace-"));
const preferredPort = 48173;
process.env.AETHER_CONFIG_HOME = configHome;
const cliConfig = await import(pathToFileURL(resolve("dist/cli-config.js")).href);
await cliConfig.configureCliProvider({ provider: "nemotron", apiKey: "packaged-cli-test-key" });

function listen(port) {
  return new Promise((resolveListen, rejectListen) => {
    const server = createServer();
    server.once("error", rejectListen);
    server.listen({ host: "127.0.0.1", port }, () => resolveListen(server));
  });
}

function startOnce() {
  return new Promise((resolveStart, rejectStart) => {
    const child = spawn(executable, [workspace], {
      env: {
        ...process.env,
        AETHER_CONFIG_HOME: configHome,
        AETHER_NO_BROWSER: "1",
        PORT: String(preferredPort),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      rejectStart(new Error("The packaged CLI did not start a local server within 20 seconds."));
    }, 20_000);
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
      if (/Server running on http:\/\/localhost:\d+\/?/.test(output)) {
        clearTimeout(timeout);
        child.kill("SIGTERM");
      }
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (!/Server running on http:\/\/localhost:\d+\/?/.test(output)) {
        rejectStart(new Error(`The packaged CLI exited before startup (code ${code ?? "unknown"}).\n${output}`));
        return;
      }
      resolveStart(output);
    });
  });
}

let occupied;
try {
  occupied = await listen(preferredPort);
  const firstOutput = await startOnce();
  if (firstOutput.includes("First-time configuration is required")) throw new Error("A saved encrypted provider configuration was not detected on first packaged startup.");
  const firstUrl = firstOutput.match(/Server running on (http:\/\/localhost:(\d+)\/?)/)?.[1];
  if (!firstUrl || firstUrl.endsWith(`:${preferredPort}`)) throw new Error("The packaged CLI did not move away from the intentionally occupied preferred port.");
  const secondOutput = await startOnce();
  if (secondOutput.includes("First-time configuration is required")) throw new Error("The packaged CLI asked for setup again instead of reusing encrypted local configuration.");
  process.stdout.write(`✓ Packaged CLI started twice with saved encrypted configuration and used a fallback local port: ${firstUrl}\n`);
} finally {
  await new Promise((resolveClose) => occupied?.close(resolveClose) ?? resolveClose());
  await rm(configHome, { recursive: true, force: true });
  await rm(workspace, { recursive: true, force: true });
}
