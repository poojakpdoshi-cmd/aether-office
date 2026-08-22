import { getProviderAdapter } from "./providers";

export type ManagerChatReply = {
  reply: string;
  kind: "conversation" | "task-proposed";
  taskCandidate?: string;
};

const greetingPattern = /^(hi|hello|hey|good\s+(morning|afternoon|evening))(\s+(sir|manager|aetheroffice))?[!. ]*$/i;
const taskPattern = /\b(build|create|implement|develop|fix|make|research|analy[sz]e|plan|design|refactor|test)\b/i;
const managerIdentityPattern = /\b(who\s+are\s+you|what\s+are\s+you|which\s+(ai|model|llm)|what\s+(ai|model|llm)|which\s+provider|what\s+provider|what\s+model|model\s+are\s+you|ai\s+are\s+you)\b/i;
const basicHelpPattern = /^(help|what can you do|how does this work|what do you do)[?.! ]*$/i;

export async function respondToManagerChat(message: string): Promise<ManagerChatReply> {
  const clean = message.trim().replace(/\s+/g, " ").slice(0, 2_000);
  if (!clean) throw new Error("Write a message for the AetherOffice manager.");
  if (greetingPattern.test(clean)) {
    return { kind: "conversation", reply: "Hello sir! I'm the manager of AetherOffice. How can I help you today?" };
  }
  if (managerIdentityPattern.test(clean)) {
    return { kind: "conversation", reply: "I'm the General Manager of AetherOffice. I coordinate the office, clarify your goals, arrange team research, and bring you an approval-ready plan before work begins." };
  }
  if (basicHelpPattern.test(clean)) {
    return { kind: "conversation", reply: "I’m the General Manager of AetherOffice. Tell me what you want to make or change, and I’ll guide a meeting, team research, and an approval-ready plan." };
  }
  if (taskPattern.test(clean)) {
    return {
      kind: "task-proposed",
      taskCandidate: clean,
      reply: "I understand the task. First, we will hold a manager meeting and send the agreed conclusion to the configured team for research. I will bring back one owner-reviewable plan. No work starts until you approve it.",
    };
  }
  try {
    const response = await getProviderAdapter("manus").generate({
      system: "You are Manus, the primary fast manager of a local-first AI software office. Reply in one or two short sentences. Be helpful and professional. Do not claim files, tests, commands, or employee work have run. Do not start a team task; ask the owner to state an explicit task when appropriate.",
      user: clean,
    });
    return { kind: "conversation", reply: response.trim().slice(0, 900) || "I am ready to help. Please tell me what you would like the office to plan or change." };
  } catch {
    return { kind: "conversation", reply: "I am the manager of AetherOffice. Please tell me what you would like the office to plan or change." };
  }
}
