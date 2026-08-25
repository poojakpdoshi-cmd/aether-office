import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("AetherOffice non-default workspace controls", () => {
  it("keeps editor, controlled execution, and local-only Git controls behind explicit workspace views", () => {
    expect(homeSource).toContain('files: "Files"');
    expect(homeSource).toContain('editor: "Editor"');
    expect(homeSource).toContain('return requestedView ? QUERY_WORKSPACE_VIEWS[requestedView] ?? "Office" : "Office"');
    expect(homeSource).toContain("trpc.aether.searchFiles.useQuery");
    expect(homeSource).toContain("Selected replacement review");
    expect(homeSource).toContain("Accept into draft");
    expect(homeSource).toContain("Local edit history keeps the latest 80 draft states");
    expect(homeSource).toContain("Unsaved changes");
    expect(homeSource).toContain("Project file tree");
    expect(homeSource).toContain("workspaceTree.useQuery");
    expect(homeSource).toContain("Open editor tabs");
    expect(homeSource).toContain("closeWorkspaceFile");
    expect(homeSource).toContain("Controlled command console");
    expect(homeSource).toContain("Explicit permissions");
    expect(homeSource).toContain("Cancel run");
    expect(homeSource).toContain("Retry (");
    expect(homeSource).toContain("no remote-push capability");
    expect(homeSource).toContain("Revert locally");
  });

  it("renders the newest persisted meeting in the manager rail instead of retaining a stale first meeting", () => {
    expect(homeSource).toContain("dashboard?.meetings.slice().sort((left, right) => right.updatedAt - left.updatedAt)[0]");
  });
});
