import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const officeSource = readFileSync(new URL("../client/src/components/LiveOffice.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

describe("office motion performance", () => {
  it("uses real employee positions with compositor-friendly FLIP transitions and reduced-motion support", () => {
    expect(officeSource).toContain("const previousAgentRects = useRef(new Map<string, DOMRect>())");
    expect(officeSource).toContain("node.animate(createAgentMotionFrames(deltaX, deltaY, mobileMotion)");
    expect(officeSource).toContain('const restingTransform = mobileMotion ? "translate3d(-50%, -50%, 0) scale(.82)" : "translate3d(-50%, -50%, 0)"');
    expect(officeSource).toContain('mobileMotion ? " scale(.82)" : ""');
    expect(styles).toContain(".illustrated-agent{position:absolute");
    expect(styles).toContain("will-change:transform");
    expect(styles).toContain("contain:layout paint");
    expect(styles).toContain("@media(prefers-reduced-motion:reduce)");
  });
});
