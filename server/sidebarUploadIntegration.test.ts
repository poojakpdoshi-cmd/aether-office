import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardLayout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("sidebar and upload integration", () => {
  it("uses the sidebar library trigger without custom persisted width or resize machinery", () => {
    expect(dashboardLayout).toContain("<SidebarTrigger");
    expect(dashboardLayout).not.toContain("sidebar-width");
    expect(dashboardLayout).not.toContain("cursor-col-resize");
    expect(dashboardLayout).not.toContain("toggleSidebar");
  });

  it("keeps the office map sidebar-free while uploads use the controlled import route with visible safe errors", () => {
    expect(home).toContain("no sidebar is rendered");
    expect(home).toContain("trpc.aether.importUpload.useMutation");
    expect(home).toContain("Owner uploaded a file to the selected workspace.");
    expect(home).toContain("The attachment could not be imported. Select a workspace and use a supported file type.");
  });
});
