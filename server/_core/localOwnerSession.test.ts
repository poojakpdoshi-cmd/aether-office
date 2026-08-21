import { describe, expect, it } from "vitest";
import { hasLocalOwnerSession } from "./localOwnerSession";

describe("loopback local owner sessions", () => {
  it("accepts only the exact HttpOnly-cookie token while local-only mode is enabled", () => {
    const originalMode = process.env.AETHER_LOCAL_ONLY;
    const originalToken = process.env.AETHER_LOCAL_OWNER_TOKEN;
    process.env.AETHER_LOCAL_ONLY = "true";
    process.env.AETHER_LOCAL_OWNER_TOKEN = "owner-token";
    try {
      expect(hasLocalOwnerSession({ headers: { cookie: "aether_local_owner=owner-token" } } as never)).toBe(true);
      expect(hasLocalOwnerSession({ headers: { cookie: "aether_local_owner=wrong-token" } } as never)).toBe(false);
    } finally {
      if (originalMode === undefined) delete process.env.AETHER_LOCAL_ONLY;
      else process.env.AETHER_LOCAL_ONLY = originalMode;
      if (originalToken === undefined) delete process.env.AETHER_LOCAL_OWNER_TOKEN;
      else process.env.AETHER_LOCAL_OWNER_TOKEN = originalToken;
    }
  });

  it("does not accept a local token when the server is not loopback-only", () => {
    const originalMode = process.env.AETHER_LOCAL_ONLY;
    const originalToken = process.env.AETHER_LOCAL_OWNER_TOKEN;
    process.env.AETHER_LOCAL_ONLY = "false";
    process.env.AETHER_LOCAL_OWNER_TOKEN = "owner-token";
    try {
      expect(hasLocalOwnerSession({ headers: { cookie: "aether_local_owner=owner-token" } } as never)).toBe(false);
    } finally {
      if (originalMode === undefined) delete process.env.AETHER_LOCAL_ONLY;
      else process.env.AETHER_LOCAL_ONLY = originalMode;
      if (originalToken === undefined) delete process.env.AETHER_LOCAL_OWNER_TOKEN;
      else process.env.AETHER_LOCAL_OWNER_TOKEN = originalToken;
    }
  });
});
