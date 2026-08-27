import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectFile = (relativePath: string) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));

describe("local provider secrets template", () => {
  it("is Git-ignored and loaded only by the local CLI process", () => {
    const ignoreRules = readFileSync(projectFile(".gitignore"), "utf8");
    const template = readFileSync(projectFile(".env.local"), "utf8");
    const cli = readFileSync(projectFile("bin/aether.mjs"), "utf8");
    const openRouterMarker = ["OPENROUTER_API_KEY", ""].join("=");
    const nvidiaMarker = ["NVIDIA_API_KEY", ""].join("=");
    expect(ignoreRules).toContain(".env.local");
    expect(template).toContain(openRouterMarker);
    expect(template).toContain(nvidiaMarker);
    expect(template).not.toMatch(/(?:ghp_|github_pat_|sk-or-v1-|AIza[\w-]{20,})/);
    expect(cli).toContain('".env.local"');
    expect(cli).toContain("--env-file=${localSecretsFile}");
  });
});
