import { describe, expect, it } from "vitest";
import { createJobQueue } from "@/server/media/job-queue";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("createJobQueue", () => {
  it("runs jobs in one lane one at a time, in order", async () => {
    const queue = createJobQueue();
    const log: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const job = (name: string) => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      log.push(`start ${name}`);
      await tick();
      log.push(`end ${name}`);
      running--;
    };
    await Promise.all([queue.enqueue("video", job("a")), queue.enqueue("video", job("b"))]);
    expect(maxRunning).toBe(1);
    expect(log).toEqual(["start a", "end a", "start b", "end b"]);
  });

  it("runs different lanes side by side", async () => {
    const queue = createJobQueue();
    let running = 0;
    let maxRunning = 0;
    const job = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await tick();
      running--;
    };
    await Promise.all([queue.enqueue("video", job), queue.enqueue("voice", job)]);
    expect(maxRunning).toBe(2);
  });

  it("keeps going after a job fails", async () => {
    const queue = createJobQueue();
    const failed = queue.enqueue("video", async () => {
      throw new Error("boom");
    });
    const after = queue.enqueue("video", async () => "ok");
    await expect(failed).rejects.toThrow("boom");
    await expect(after).resolves.toBe("ok");
  });
});