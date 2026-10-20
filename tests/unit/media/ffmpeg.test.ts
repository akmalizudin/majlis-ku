import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeVideoCopies, makeVoiceCopy, parseDuration, probeDuration } from "@/server/media/ffmpeg";

const run = promisify(execFile);
let dir: string;
let video: string;
let voice: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "majlis-ffmpeg-"));
  video = join(dir, "in.mp4");
  voice = join(dir, "in.webm");
  // A 2-second test pattern with a tone, and a 1.5-second Opus voice note.
  await run(ffmpegPath!, ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=10",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", video]);
  await run(ffmpegPath!, ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=300:duration=1.5", "-c:a", "libopus", voice]);
}, 60_000);

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("parseDuration", () => {
  it("reads ffmpeg's Duration line", () => {
    expect(parseDuration("  Duration: 00:01:02.50, start: 0.000000, bitrate: 1 kb/s")).toBe(62.5);
    expect(parseDuration("no duration here")).toBeNull();
    expect(parseDuration("Duration: N/A, bitrate: N/A")).toBeNull();
  });
});

describe("ffmpeg media copies", () => {
  it("probes a video's length", async () => {
    const seconds = await probeDuration(video);
    expect(seconds).toBeGreaterThan(1.8);
    expect(seconds).toBeLessThan(2.3);
  });

  it("makes an MP4 copy and a poster frame", async () => {
    const out = await makeVideoCopies(video, dir, { maxSeconds: 60 });
    const mp4 = await readFile(out.video);
    expect(mp4.subarray(4, 8).toString()).toBe("ftyp");
    const poster = await readFile(out.poster);
    expect(poster.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(out.durationSec).toBeGreaterThan(1.8);
  }, 60_000);

  it("turns an Opus voice note into an m4a", async () => {
    const out = await makeVoiceCopy(voice, dir);
    expect((await stat(out.audio)).size).toBeGreaterThan(1000);
    const head = await readFile(out.audio);
    expect(head.subarray(4, 8).toString()).toBe("ftyp");
    expect(out.durationSec).toBeGreaterThan(1.3);
  }, 60_000);

  it("rejects a file that is not media", async () => {
    const junk = join(dir, "junk.mp4");
    await import("node:fs/promises").then((fs) => fs.writeFile(junk, "not a video"));
    await expect(makeVideoCopies(junk, dir, { maxSeconds: 60 })).rejects.toThrow();
  }, 60_000);
});