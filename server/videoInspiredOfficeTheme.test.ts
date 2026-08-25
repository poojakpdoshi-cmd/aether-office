import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const office = readFileSync(new URL("../client/src/components/LiveOffice.tsx", import.meta.url), "utf8");
const control = readFileSync(new URL("../client/src/components/OfficeControlChatbox.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../client/src/pages/owner-floor.css", import.meta.url), "utf8");

describe("video-informed post-animation office treatment", () => {
  it("reveals the secured control surface only after the office animation settles", () => {
    expect(office).toContain("const [postAnimationReady, setPostAnimationReady]");
    expect(office).toContain("window.setTimeout(() => setPostAnimationReady(true), 620)");
    expect(office).toContain('sideControl && postAnimationReady ? <div className="office-post-animation-control">');
    expect(styles).toContain("@keyframes office-control-settle");
  });

  it("uses a light simplified office-console rail and keeps secure controls in the lower page", () => {
    expect(control).not.toContain('className="office-manager-avatar"');
    expect(control).not.toContain('className="office-manager-roster"');
    expect(control).toContain("onStartProposedTask");
    expect(control).toContain("onSendMessage");
    expect(control).toContain("Tap an empty part of the office floor");
    expect(styles).toContain("background: #ece5d2");
    expect(styles).toContain("background: #fff8e9");
    expect(styles).toContain(".office-control-chatbox");
  });

  it("preserves real-state-only direct corridor movement and reduced-motion handling", () => {
    expect(office).toContain("const horizontalFirst = Math.abs(deltaX) >= Math.abs(deltaY)");
    expect(office).toContain("duration: Math.min(1450, 620 + Math.hypot(deltaX, deltaY) * 2.1)");
    expect(office).toContain('easing: "linear"');
    expect(office).not.toContain('className="office-anime-walker"');
    expect(styles).not.toContain(".text-free-office .illustrated-walking .office-anime-walker");
    expect(styles).not.toContain("@keyframes aether-office-anime-walk");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).not.toContain("office-anime-walker");
  });
});
