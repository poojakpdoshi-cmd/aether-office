import { describe, expect, it, vi } from "vitest";
import { respondToManagerChat } from "./managerChat";

vi.mock("./providers", () => ({ getProviderAdapter: () => ({ generate: vi.fn(async () => "Manager response") }) }));

describe("manager chat", () => {
  it("answers the required greeting without starting a task", async () => {
    await expect(respondToManagerChat("hello")).resolves.toEqual({ kind: "conversation", reply: "Hello sir! I'm the manager of AetherOffice. How can I help you today?" });
  });

  it("proposes explicit work without starting DeepDiscuss automatically", async () => {
    await expect(respondToManagerChat("Build a local notes app")).resolves.toMatchObject({ kind: "task-proposed", taskCandidate: "Build a local notes app" });
  });

  it("answers a manager identity question instantly without exposing an underlying provider or model", async () => {
    const reply = await respondToManagerChat("Which model are you?");
    expect(reply.kind).toBe("conversation");
    expect(reply.reply).toContain("General Manager of AetherOffice");
    expect(reply.reply).not.toMatch(/OpenAI|Gemini|Manus|provider|model/i);
  });
});
