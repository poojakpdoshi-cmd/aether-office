import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const discussion = readFileSync(new URL("./aether/deepDiscuss.ts", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const managerRail = readFileSync(new URL("../client/src/components/OfficeControlChatbox.tsx", import.meta.url), "utf8");

describe("provider setup status", () => {
  it("returns only provider-readiness metadata and never API-key material in the dashboard", () => {
    expect(router).toContain("setupRequiredEmployeeIds");
    expect(router).toContain("configuredProviders");
    expect(router).not.toContain("apiKey: dashboard");
  });

  it("resets stale employee errors when no provider is available for a meeting", () => {
    expect(discussion).toContain("resetEmployeeStatuses();");
    expect(discussion).toContain("Provider setup required: add at least one API key");
  });

  it("labels unconfigured workers as setup required while retaining real failures without displaying manager-rail error badges", () => {
    expect(home).toContain('"SETUP REQUIRED"');
    expect(home).toContain("setupRequiredEmployeeIds.has(employee.id)");
    expect(managerRail).toContain('manager.status !== "ERROR"');
  });
});
