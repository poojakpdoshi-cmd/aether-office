import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const homePage = readFileSync(fileURLToPath(new URL("../../client/src/pages/Home.tsx", import.meta.url)), "utf8");

describe("button-free office flow", () => {
  it("starts a discussion from the Manager command route and returns attention to the Discussion Room", () => {
    expect(homePage).toContain('startedManagerTaskRef');
    expect(homePage).toContain('setActiveView("Office")');
    expect(homePage).toContain('setOfficeFocus("DeepDiscuss Room")');
    expect(homePage).toContain('startDeepDiscussMutation.mutate({ task: submittedTask })');
    expect(homePage).not.toContain('Start DeepDiscuss');
  });

  it("does not retain visible employee-addition labels or its onboarding state", () => {
    expect(homePage).not.toContain('+ Add employee');
    expect(homePage).not.toContain('Add Employee');
    expect(homePage).not.toContain('autoEmployeeKey');
    expect(homePage).not.toContain('recognizeEmployeeMutation');
  });
});
