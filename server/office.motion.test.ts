import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const officeSource = readFileSync(new URL("../client/src/components/LiveOffice.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const officeStyles = readFileSync(new URL("../client/src/pages/owner-floor.css", import.meta.url), "utf8");

describe("office motion performance", () => {
  it("uses real employee positions with compositor-friendly FLIP transitions and visible walking only for a genuine THINKING corridor state", () => {
    expect(officeSource).toContain("const previousAgentRects = useRef(new Map<string, DOMRect>())");
    expect(officeSource).toContain("node.animate(createAgentMotionFrames(deltaX, deltaY, mobileMotion)");
    expect(officeSource).toContain('const restingTransform = mobileMotion ? "translate3d(-50%, -50%, 0) scale(.82)" : "translate3d(-50%, -50%, 0)"');
    expect(officeSource).toContain('mobileMotion ? " scale(.82)" : ""');
    expect(styles).toContain(".illustrated-agent{position:absolute");
    expect(styles).toContain("will-change:transform");
    expect(styles).toContain("contain:layout paint");
    expect(styles).toContain("@media(prefers-reduced-motion:reduce)");
    expect(officeSource).toContain('if (employee.status === "THINKING")');
    expect(officeSource).toContain('state: "walking"');
    expect(officeSource).toContain('const corridorWalkerAssets = [');
    expect(officeSource).toContain('"/manus-storage/aether-office-walking-employee-final_4d75bef9.png"');
    expect(officeSource).toContain('pos.state === "walking" ? <img className="office-corridor-walker"');
    expect(officeSource).toContain('data-motion-state={pos.state}');
    expect(officeStyles).toContain('.text-free-office .illustrated-walking .office-corridor-walker');
    expect(officeStyles).toContain('animation: office-corridor-walk');
    expect(officeStyles).toContain('.text-free-office .office-corridor-walker { display: none; }');
    expect(officeStyles).not.toContain("office-walking-person");
  });

  it("adds three transform-only ambient office treatments without restoring a synthetic worker overlay", () => {
    expect(officeStyles).toContain(".office-animation-metro .real-office-backdrop { will-change:transform; animation:office-metro-drift");
    expect(officeStyles).toContain(".office-animation-warm .real-office-backdrop { will-change:transform; animation:office-warm-drift");
    expect(officeStyles).toContain(".office-animation-stealth .real-office-backdrop { will-change:transform; animation:office-stealth-drift");
    expect(officeStyles).toContain(".office-animation-warm .real-office-stage::after");
    expect(officeStyles).toContain(".office-animation-stealth .real-office-stage::after");
    expect(officeStyles).toContain(".office-animation-metro .real-office-stage::before");
    expect(officeStyles).toContain("office-metro-worklight");
    expect(officeStyles).toContain("office-warm-worklight");
    expect(officeStyles).toContain("office-stealth-worklight");
    expect(officeStyles).toContain(".text-free-office .office-map-overlay { position: absolute; z-index: 4;");
    expect(officeStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(officeStyles).not.toContain("office-anime-walker");
  });
});
