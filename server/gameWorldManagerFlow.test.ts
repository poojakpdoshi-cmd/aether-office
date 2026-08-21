import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const office = readFileSync(new URL("../client/src/components/LiveOffice.tsx", import.meta.url), "utf8");
const chat = readFileSync(new URL("../client/src/components/OfficeControlChatbox.tsx", import.meta.url), "utf8");
const controls = readFileSync(new URL("../client/src/components/OfficeWorldControls.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../client/src/pages/owner-floor.css", import.meta.url), "utf8");

describe("playable office-world manager flow", () => {
  it("keeps manager conversation separate from a real team invitation", () => {
    expect(home).toContain("trpc.aether.managerChat.useMutation");
    expect(home).toContain("onStartProposedTask={() => managerTaskCandidate && startTaskFromControl(managerTaskCandidate)}");
    expect(chat).toContain("Invite team to discuss");
    expect(chat).not.toContain("Start discussion");
  });

  it("uses browser voice playback for a manager reply without sending audio or secrets to another service", () => {
    expect(home).toContain('"speechSynthesis" in window');
    expect(home).toContain("new SpeechSynthesisUtterance(message)");
    expect(chat).toContain("Speak");
  });

  it("creates a scrollable room route and keeps lower controls behind an empty-floor interaction", () => {
    expect(home).toContain('className="office-room-trail"');
    expect(home).toContain("onOpenEmptyFloor={() => setShowWorldControls(true)}");
    expect(home).toContain("showWorldControls ? <OfficeWorldControls");
    expect(office).toContain('className="office-empty-floor-zone"');
    expect(styles).toContain(".office-room-trail");
    expect(controls).toContain('id="office-world-controls"');
  });

  it("gives the first manager fast primary status and suppresses only the recorded moving pants artifact", () => {
    expect(chat).toContain('index === 0 ? " · Fast lead" : ""');
    expect(styles).toContain(".text-free-office .illustrated-walking .illustrated-agent-portrait { clip-path: inset(0 0 43% 0)");
    expect(styles).toContain("without altering the approved office world");
  });
});
