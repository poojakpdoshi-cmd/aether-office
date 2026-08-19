import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("employee inspection workspace UI", () => {
  it("uses the real employee inspection route when an employee, desk, or laptop is selected", () => {
    expect(source).toContain("trpc.aether.employeeInspection.useQuery");
    expect(source).toContain("EmployeeInspectionPanel");
    expect(source).toContain("Live employee workspace");
  });

  it("labels terminal, file, activity, and change panels as real controlled data and guards sensitive information", () => {
    expect(source).toContain("REAL EVENTS ONLY");
    expect(source).toContain("Files accessed or changed");
    expect(source).toContain("Safe status summaries only. Provider keys, private prompts, unrestricted shell sessions, and hidden reasoning are never displayed.");
  });

  it("renders controlled browser-test evidence and keeps the proof-report truth boundary explicit", () => {
    expect(source).toContain("Run browser test");
    expect(source).toContain("Console and errors");
    expect(source).toContain("Network evidence");
    expect(source).toContain("This does not invent screenshots or browser-test results.");
  });
});
