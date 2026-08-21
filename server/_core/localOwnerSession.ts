import { timingSafeEqual } from "node:crypto";
import type { Express, Request } from "express";

export const LOCAL_OWNER_COOKIE = "aether_local_owner";

function readCookie(request: Request, name: string) {
  const prefix = `${name}=`;
  return request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

function isExpectedToken(value: string | undefined) {
  const expected = process.env.AETHER_LOCAL_OWNER_TOKEN;
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function hasLocalOwnerSession(request: Request) {
  return process.env.AETHER_LOCAL_ONLY === "true" && isExpectedToken(readCookie(request, LOCAL_OWNER_COOKIE));
}

export function registerLocalOwnerSessionRoute(app: Express) {
  if (process.env.AETHER_LOCAL_ONLY !== "true") return;
  app.get("/api/local-owner-session", (request, response) => {
    const token = typeof request.query.token === "string" ? request.query.token : undefined;
    if (!isExpectedToken(token)) {
      response.status(401).json({ error: "A valid one-time local owner launch token is required." });
      return;
    }
    response.cookie(LOCAL_OWNER_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: 8 * 60 * 60 * 1000,
    });
    response.status(204).end();
  });
}
