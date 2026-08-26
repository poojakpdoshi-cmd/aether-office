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
    expect(chat).toContain("Start manager meeting & research");
    expect(chat).toContain("Approve plan & allow work");
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
    expect(styles).toContain(".text-free-office.office-with-control { grid-template-columns: minmax(0, 1fr) minmax(260px, 315px); align-items: start; min-height: 0;");
    expect(controls).toContain('id="office-world-controls"');
  });

  it("keeps the simplified manager rail and photo-real office map free of synthetic worker overlays", () => {
    expect(chat).not.toContain('index === 0 ? " · Fast lead" : ""');
    expect(chat).not.toContain("Primary manager");
    expect(home).toContain("speakManagerText(result.reply)");
    expect(styles).toContain(".text-free-office .illustrated-agent-portrait { display: none !important; }");
    expect(styles).not.toContain("office-anime-walker");
    expect(styles).not.toContain("office-motion-marker");
    expect(office).not.toContain('className="office-anime-walker"');
    expect(office).not.toContain("illustrated-agent-portrait");
  });

  it("keeps working map controls while offering the owner three selectable animation styles", () => {
    expect(office).toContain('htmlFor="office-animation-style"');
    expect(office).toContain("Set your animation");
    expect(office).toContain("OFFICE_ANIMATION_STYLES");
    expect(office).toContain("onOpenEmployeeRoom");
    expect(office).toContain("onInspectEmployeeComputer");
    expect(office).toContain("onOpenEmptyFloor");
  });
});
