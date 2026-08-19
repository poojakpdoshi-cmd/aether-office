import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("AetherOffice non-default workspace controls", () => {
  it("keeps editor review controls and workspace search behind explicit workspace views", () => {
    expect(homeSource).toContain('files: "Files"');
    expect(homeSource).toContain('editor: "Editor"');
    expect(homeSource).toContain('return requestedView ? QUERY_WORKSPACE_VIEWS[requestedView] ?? "Office" : "Office"');
    expect(homeSource).toContain("trpc.aether.searchFiles.useQuery");
    expect(homeSource).toContain("Selected replacement review");
    expect(homeSource).toContain("Accept into draft");
    expect(homeSource).toContain("Local edit history keeps the latest 80 draft states");
    expect(homeSource).toContain("Unsaved changes");
  });
});
