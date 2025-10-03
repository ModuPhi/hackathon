import { describe, expect, test } from "vitest";
import { createEphemeralKeyPair } from "./keyless-context";

describe("createEphemeralKeyPair", () => {
  test("generates a non-expired key pair with nonce", () => {
    const keyPair = createEphemeralKeyPair();
    expect(keyPair.isExpired()).toBe(false);
    expect(typeof keyPair.nonce).toBe("string");
    expect(keyPair.nonce.length).toBeGreaterThan(0);
  });
});
