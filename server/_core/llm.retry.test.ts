import { describe, expect, it } from "vitest";
import { isRetryableHttpStatus } from "./llm";

describe("built-in LLM retry classification", () => {
  it("retries only transient HTTP responses and immediately surfaces configuration or precondition failures", () => {
    expect(isRetryableHttpStatus(408)).toBe(true);
    expect(isRetryableHttpStatus(409)).toBe(true);
    expect(isRetryableHttpStatus(425)).toBe(true);
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(401)).toBe(false);
    expect(isRetryableHttpStatus(403)).toBe(false);
    expect(isRetryableHttpStatus(412)).toBe(false);
  });
});
