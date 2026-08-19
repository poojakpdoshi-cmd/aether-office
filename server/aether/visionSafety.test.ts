import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(fileURLToPath(new URL("./workspace.ts", import.meta.url)), "utf8");
const visionSource = readFileSync(fileURLToPath(new URL("./deepDiscuss.ts", import.meta.url)), "utf8");
const routerSource = readFileSync(fileURLToPath(new URL("../routers.ts", import.meta.url)), "utf8");

describe("local vision inspection safety", () => {
  it("accepts only bounded supported image types from the selected workspace", () => {
    expect(workspaceSource).toContain('const mimeTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" }');
    expect(workspaceSource).toContain('Only supported image uploads can be sent to a vision-capable provider.');
    expect(workspaceSource).toContain('details.size > 10 * 1024 * 1024');
    expect(workspaceSource).toContain('resolvedExistingPath(relativePath)');
  });

  it("keeps inspection server-side and returns only analysis plus mime metadata through the router", () => {
    const inspectRoute = routerSource.match(/inspectImage:[\s\S]*?evaluate:/)?.[0] ?? "";
    expect(visionSource).toContain('const vision = await getConfiguredVisionProvider();');
    expect(visionSource).toContain('model: vision.model');
    expect(visionSource).toContain('Do not invent content that is not visible.');
    expect(routerSource).toContain('readWorkspaceImage(input.path, "Manus", "Inspect owner-provided visual reference.")');
    expect(routerSource).toContain('analysis: await inspectVisualReference(image.dataUrl, input.prompt), mimeType: image.mimeType');
    expect(inspectRoute).not.toContain('apiKey');
  });
});
