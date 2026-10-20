import { describe, expect, it } from "vitest";
import { eventIcs } from "@/server/ecard/ics";

describe("eventIcs", () => {
  const ics = eventIcs({
    uid: "evt1@majlisku",
    title: "Walimatulurus Aisyah & Daniel",
    startsAt: new Date("2026-12-12T03:00:00Z"),
    endsAt: null,
    location: "Dewan Seri, Jalan 1, Kuala Lumpur",
    description: "Butiran:\nhttps://example.com/i/x",
    url: "https://example.com/i/x",
    now: new Date("2026-10-20T00:00:00Z"),
  });

  it("is a VCALENDAR with CRLF line ends", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("uses UTC times and a 4-hour default length", () => {
    expect(ics).toContain("DTSTART:20261212T030000Z");
    expect(ics).toContain("DTEND:20261212T070000Z");
  });

  it("escapes commas and new lines", () => {
    expect(ics).toContain("LOCATION:Dewan Seri\\, Jalan 1\\, Kuala Lumpur");
    expect(ics).toContain("DESCRIPTION:Butiran:\\nhttps://example.com/i/x");
  });
});