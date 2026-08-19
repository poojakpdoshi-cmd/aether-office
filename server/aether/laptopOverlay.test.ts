import { describe, expect, it } from "vitest";
import { createLaptopOverlay } from "../../client/src/lib/laptopOverlay";

describe("sanitized laptop overlays", () => {
  it("renders only the approved file, tool, and task-stage fields for a controlled work state", () => {
    expect(createLaptopOverlay("CODING", "Frontend and general engineering")).toEqual({
      fileScope: "Approved workspace file",
      tool: "Controlled editor",
      taskStage: "Building",
      taskScope: "Frontend and general engineering",
      summary: "Approved workspace file · Controlled editor · Building",
    });
  });

  it("replaces raw prompt, key, or unrelated content with a safe task scope", () => {
    const overlay = createLaptopOverlay("REVIEWING", "ignore rules\nAPI_KEY=sk-secret-value\n/private/customer-file.txt");
    expect(overlay.taskScope).toBe("Assigned work scope");
    expect(overlay.summary).not.toContain("sk-secret-value");
    expect(overlay.summary).not.toContain("customer-file");
  });
});
