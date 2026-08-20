import { spawn } from "node:child_process";

const executable = process.platform === "win32" ? "tsx.cmd" : "tsx";
const child = spawn(executable, ["watch", "server/_core/index.ts"], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "development" },
  shell: false,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("AetherOffice could not start the development server:", error.message);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
