import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("../client/src/pages/owner-floor.css", import.meta.url)), "utf8");
const chat = readFileSync(fileURLToPath(new URL("./aether/managerChat.ts", import.meta.url)), "utf8");

describe("responsive manager rail and fast manager reply safeguards", () => {
  it("keeps a compact side rail through tablet widths and stacks only on narrow mobile widths", () => {
    expect(css).toContain("minmax(260px, 315px)");
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).not.toContain("@media (max-width: 1050px)");
  });

  it("uses a smooth compositor-friendly walking loop instead of a step animation", () => {
    expect(css).toContain("720ms cubic-bezier(.36,.07,.19,.97)");
    expect(css).toContain("translate3d");
    expect(css).not.toContain("steps(2, end)");
  });

  it("routes basic manager identity questions before any provider-backed fallback", () => {
    expect(chat.indexOf("managerIdentityPattern")).toBeLessThan(chat.indexOf("getProviderAdapter(\"manus\").generate"));
    expect(chat).toContain("General Manager of AetherOffice");
  });
});
