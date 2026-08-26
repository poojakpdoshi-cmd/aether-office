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
    expect(homeSource).toContain('refetchOnMount: "always", refetchOnWindowFocus: "always", staleTime: 0');
    expect(homeSource).toContain("onSuccess: async () => { await dashboardQuery.refetch();");
  });

  it("persists the selected office animation style locally", () => {
    expect(homeSource).toContain('window.localStorage.getItem("aether-office-animation-style")');
    expect(homeSource).toContain('saved === "warm" || saved === "stealth" || saved === "metro" ? saved : "metro"');
    expect(homeSource).toContain('window.localStorage.setItem("aether-office-animation-style", officeAnimationStyle)');
    expect(homeSource).toContain("animationStyle={officeAnimationStyle}");
    expect(homeSource).toContain("onAnimationStyleChange={setOfficeAnimationStyle}");
  });

  it("requires provider verification before saving and surfaces the safe backend failure reason", () => {
    expect(homeSource).toContain('configureProviderMutation.isPending ? "Verifying…" : "Verify & save"');
    expect(homeSource).toContain("configureProviderMutation.error.message");
    expect(homeSource).not.toContain("The provider could not be saved. Check the local configuration and try again.");
  });
});
