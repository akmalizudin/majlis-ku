import { describe, expect, it } from "vitest";
import { pickRecorderMime } from "@/components/guest/recorder-mime";

describe("pickRecorderMime", () => {
  it("prefers Opus in WebM (Chrome, Android)", () => {
    expect(pickRecorderMime(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("falls back to MP4 (Safari on iPhone)", () => {
    expect(pickRecorderMime((type) => type === "audio/mp4")).toBe("audio/mp4");
  });

  it("returns null when nothing is supported or the check throws", () => {
    expect(pickRecorderMime(() => false)).toBeNull();
    expect(
      pickRecorderMime(() => {
        throw new Error("no MediaRecorder");
      }),
    ).toBeNull();
  });
});