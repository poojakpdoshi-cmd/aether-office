import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const auditSource = readFileSync(new URL("../../scripts/audit-office-interactions.mjs", import.meta.url), "utf8");

describe("local-owner office audit", () => {
  it("waits for the one-time local-owner session handshake before sending protected manager messages", () => {
    expect(auditSource).toContain('page.locator(".office-task-input:not([disabled])").waitFor({ timeout: 15_000 })');
    expect(auditSource).toContain('AETHER_OFFICE_AUDIT_OWNER_SESSION === "1" && localOwnerToken');
  });
});
