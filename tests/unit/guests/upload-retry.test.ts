import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadError, withRetry } from "@/components/guest/upload-client";

afterEach(() => {
  vi.useRealTimers();
});

describe("withRetry", () => {
  it("retries retryable failures with back-off, then succeeds", async () => {
    vi.useFakeTimers();
    const stages: string[] = [];
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new UploadError("network", true))
      .mockRejectedValueOnce(new UploadError("http_503", true))
      .mockResolvedValue("ok");
    const promise = withRetry(task, (stage) => stages.push(stage));
    await vi.advanceTimersByTimeAsync(1000 + 3000);
    await expect(promise).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(3);
    expect(stages).toEqual(["retrying", "retrying"]);
  });

  it("does not retry a non-retryable failure", async () => {
    const task = vi.fn<() => Promise<string>>().mockRejectedValue(new UploadError("limit_reached", false));
    await expect(withRetry(task, () => {})).rejects.toMatchObject({ code: "limit_reached" });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("gives up after the last try", async () => {
    vi.useFakeTimers();
    const task = vi.fn<() => Promise<string>>().mockRejectedValue(new UploadError("network", true));
    const promise = withRetry(task, () => {}, 2);
    const assertion = expect(promise).rejects.toMatchObject({ code: "network" });
    await vi.advanceTimersByTimeAsync(1000 + 3000);
    await assertion;
    expect(task).toHaveBeenCalledTimes(3);
  });
});