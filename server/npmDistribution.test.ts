import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("npm CLI distribution manifest", () => {
  it("ships the production runtime and lowercase primary command plus compatibility aliases without source-checkout-only files", async () => {
    const manifest = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")) as {
      name: string;
      bin: Record<string, string>;
      files: string[];
      engines: { node: string };
      publishConfig: { access: string };
      scripts: Record<string, string>;
    };

    expect(manifest.name).toBe("@aetheroffice/cli");
    expect(manifest.bin).toMatchObject({ aetheroffice: "bin/aether-office.mjs", AetherOffice: "bin/aether-office.mjs", aether: "bin/aether.mjs" });
    expect(manifest.files).toEqual(expect.arrayContaining(["dist", "bin", "README.md", "LICENSE"]));
    expect(manifest.files.join(" ")).not.toMatch(/\.env|server|client|scripts|test/i);
    expect(manifest.engines.node).toBe(">=22");
    expect(manifest.publishConfig.access).toBe("public");
    expect(manifest.scripts.dev).toBe("node scripts/dev.mjs");
    expect(manifest.scripts.start).toBe("node dist/index.js");
    expect(`${manifest.scripts.dev} ${manifest.scripts.start}`).not.toContain("NODE_ENV=");
  });

  it("keeps the development launcher cross-platform and owns development mode in Node", async () => {
    const launcher = await readFile(resolve(projectRoot, "scripts/dev.mjs"), "utf8");
    expect(launcher).toContain('process.platform === "win32" ? "tsx.cmd" : "tsx"');
    expect(launcher).toContain('NODE_ENV: "development"');
    expect(launcher).toContain('shell: false');
  });

  it("documents an interactive encrypted setup path and never places an example credential in the published README", async () => {
    const readme = await readFile(resolve(projectRoot, "README.md"), "utf8");
    const normalUserGuide = readme.split("## Development")[0] ?? readme;
    expect(readme).toContain("npm install --global @aetheroffice/cli");
    expect(normalUserGuide).toContain("AetherOffice");
    expect(normalUserGuide).not.toContain("git clone");
    expect(normalUserGuide).not.toContain("pnpm dev");
    expect(normalUserGuide).not.toContain("npm run dev");
    expect(readme).toContain("one at a time");
    expect(readme).toContain("~/.aether-office/");
    expect(readme).not.toMatch(/(?:ghp_|github_pat_|sk-or-v1-|AIza[\w-]{20,}|nvapi-[\w-]{20,})/);
  });
});
