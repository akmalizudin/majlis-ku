import { describe, expect, it } from "vitest";
import { nextSlide, type SlideState } from "@/components/slideshow/order";

const state = (ids: string[], current: number, queue: string[] = []): SlideState => ({ ids, current, queue });

describe("nextSlide", () => {
  it("cycles through the items and wraps around", () => {
    expect(nextSlide(state(["a", "b", "c"], 0))).toEqual(state(["a", "b", "c"], 1));
    expect(nextSlide(state(["a", "b", "c"], 2))).toEqual(state(["a", "b", "c"], 0));
  });

  it("shows queued new items first, in arrival order", () => {
    const s = state(["n1", "n2", "a", "b"], 3, ["n1", "n2"]);
    const first = nextSlide(s);
    expect(first.ids[first.current]).toBe("n1");
    expect(first.queue).toEqual(["n2"]);
    const second = nextSlide(first);
    expect(second.ids[second.current]).toBe("n2");
    expect(second.queue).toEqual([]);
  });

  it("skips queued ids that were removed", () => {
    const s = state(["a", "b"], 0, ["gone", "b"]);
    const next = nextSlide(s);
    expect(next.ids[next.current]).toBe("b");
    expect(next.queue).toEqual([]);
  });

  it("stays at 0 when there is nothing to show", () => {
    expect(nextSlide(state([], 0))).toEqual(state([], 0));
  });
});