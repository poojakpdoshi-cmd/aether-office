import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/components/AIChatBox.tsx", import.meta.url), "utf8");

describe("AIChatBox responsive layout and programmatic scrolling", () => {
  it("recalculates message layout from actual element and viewport size changes", () => {
    expect(source).toContain("new ResizeObserver(recalculateLastMessageHeight)");
    expect(source).toContain('window.addEventListener("resize", recalculateLastMessageHeight)');
    expect(source).toContain("observer?.observe(containerRef.current)");
    expect(source).toContain("observer?.observe(inputAreaRef.current)");
  });

  it("uses instant programmatic scrolling rather than smooth scrolling for message sends", () => {
    expect(source).toContain("behavior: 'auto'");
    expect(source).not.toContain("behavior: 'smooth'");
  });
});
