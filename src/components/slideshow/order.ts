// Which slide comes next: new arrivals (queued) jump the line, otherwise cycle in order.

export type SlideState = { ids: string[]; current: number; queue: string[] };

export function nextSlide({ ids, current, queue }: SlideState): SlideState {
  if (ids.length === 0) return { ids, current: 0, queue: [] };
  const pending = [...queue];
  while (pending.length > 0) {
    const id = pending.shift()!;
    const index = ids.indexOf(id);
    if (index >= 0) return { ids, current: index, queue: pending };
  }
  return { ids, current: (current + 1) % ids.length, queue: [] };
}