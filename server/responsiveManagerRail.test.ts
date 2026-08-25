import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("../client/src/pages/owner-floor.css", import.meta.url)), "utf8");
const chat = readFileSync(fileURLToPath(new URL("./aether/managerChat.ts", import.meta.url)), "utf8");

describe("responsive manager rail and fast manager reply safeguards", () => {
  it("prioritizes a video-scale map at compact desktop widths and keeps a side rail on wide desktop screens", () => {
    expect(css).toContain("minmax(260px, 315px)");
    expect(css).toContain("@media (max-width: 1280px) and (min-width: 721px)");
    expect(css).toContain("width:min(100%,calc((100dvh - 20px) * 1.777))");
    expect(css).toContain("@media (max-width: 720px)");
  });

  it("uses a smooth compositor-friendly anime character walking loop instead of a step animation", () => {
    expect(css).toContain("560ms cubic-bezier(.37,0,.63,1)");
    expect(css).toContain("translate3d");
    expect(css).not.toContain("steps(2,end)");
  });

  it("routes basic manager identity questions before any provider-backed fallback", () => {
    expect(chat.indexOf("managerIdentityPattern")).toBeLessThan(chat.indexOf("getProviderAdapter(\"manus\").generate"));
    expect(chat).toContain("General Manager of AetherOffice");
  });
});
