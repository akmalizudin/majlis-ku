import { describe, expect, it } from "vitest";
import { rsvpInputSchema, rsvpOpen, rsvpTotals } from "@/server/rsvp/rules";

describe("rsvpInputSchema", () => {
  const schema = rsvpInputSchema({ maxPax: 5, askPhone: false });

  it("keeps pax within 1..max when attending", () => {
    expect(schema.parse({ name: "Ali", attending: true, pax: 3 }).pax).toBe(3);
    expect(schema.safeParse({ name: "Ali", attending: true, pax: 6 }).success).toBe(false);
    expect(schema.safeParse({ name: "Ali", attending: true, pax: 0 }).success).toBe(false);
  });

  it("sets pax to 0 when not attending", () => {
    expect(schema.parse({ name: "Ali", attending: false, pax: 4 }).pax).toBe(0);
  });

  it("drops the phone when the host does not ask for it", () => {
    expect(schema.parse({ name: "Ali", attending: true, pax: 1, phone: "0123456789" }).phone).toBeNull();
    const withPhone = rsvpInputSchema({ maxPax: 5, askPhone: true });
    expect(withPhone.parse({ name: "Ali", attending: true, pax: 1, phone: "012-3456789" }).phone).toBe("012-3456789");
    expect(withPhone.safeParse({ name: "Ali", attending: true, pax: 1, phone: "abc" }).success).toBe(false);
  });

  it("requires a name", () => {
    expect(schema.safeParse({ name: "  ", attending: true, pax: 1 }).success).toBe(false);
  });
});

describe("rsvpOpen", () => {
  it("is closed when RSVP is off", () => {
    expect(rsvpOpen({ rsvpEnabled: false, rsvpDeadline: null }, new Date())).toBe(false);
  });

  it("stays open until the end of the deadline day in Malaysia", () => {
    const card = { rsvpEnabled: true, rsvpDeadline: "2026-12-01" };
    // 23:59 on 1 Dec in Kuala Lumpur is 15:59 UTC.
    expect(rsvpOpen(card, new Date("2026-12-01T15:59:00Z"))).toBe(true);
    expect(rsvpOpen(card, new Date("2026-12-01T16:00:01Z"))).toBe(false);
    expect(rsvpOpen({ rsvpEnabled: true, rsvpDeadline: null }, new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });
});

describe("rsvpTotals", () => {
  it("adds up replies, attending pax and declines", () => {
    const totals = rsvpTotals([
      { attending: true, pax: 3 },
      { attending: true, pax: 2 },
      { attending: false, pax: 0 },
    ]);
    expect(totals).toEqual({ replies: 3, attending: 2, pax: 5, declined: 1 });
  });
});