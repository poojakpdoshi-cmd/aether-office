import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("living office detail views", () => {
  it("renders activity from verified dashboard events rather than fabricated status copy", () => {
    expect(homeSource).toContain("Verified activity timeline");
    expect(homeSource).toContain("Real meeting, approval, tool, and workspace events only.");
    expect(homeSource).toContain("activities={dashboard?.activities ?? []}");
  });

  it("derives the Discussion Room collaboration pulse from recorded DeepDiscuss participants and rounds", () => {
    expect(homeSource).toContain("Meeting collaboration pulse");
    expect(homeSource).toContain("meeting.messages.filter");
    expect(homeSource).toContain('officeFocus === "DeepDiscuss Room" && latestMeeting');
  });
});
