import { describe, expect, it } from "vitest";
import { hashPin, signPinPass, verifyPin, verifyPinPass } from "@/server/guests/pin";

describe("event PIN", () => {
  it("verifies the right PIN and rejects a wrong one", async () => {
    const stored = await hashPin("4821");
    expect(stored).not.toContain("4821");
    expect(await verifyPin("4821", stored)).toBe(true);
    expect(await verifyPin("4822", stored)).toBe(false);
  });

  it("salts each hash", async () => {
    expect(await hashPin("1111")).not.toBe(await hashPin("1111"));
  });

  it("rejects a malformed stored hash", async () => {
    expect(await verifyPin("1111", "garbage")).toBe(false);
  });
});

describe("PIN pass cookie", () => {
  const secret = "test-secret-test-secret";

  it("is valid only for the event and device it was made for", () => {
    const pass = signPinPass("event-1", "device-a", secret);
    expect(verifyPinPass(pass, "event-1", "device-a", secret)).toBe(true);
    expect(verifyPinPass(pass, "event-2", "device-a", secret)).toBe(false);
    expect(verifyPinPass(pass, "event-1", "device-b", secret)).toBe(false);
    expect(verifyPinPass(undefined, "event-1", "device-a", secret)).toBe(false);
  });
});