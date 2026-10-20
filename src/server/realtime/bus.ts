import type { GalleryItem } from "@/server/gallery/items";

// In-process publish/subscribe for live galleries and the slideshow. One server process locally;
// with several instances later, swap this for Postgres LISTEN/NOTIFY or Redis behind the same API.

export type BusMessage = { type: "item"; item: GalleryItem } | { type: "remove"; id: string };
type Listener = (message: BusMessage) => void;

export function createBus() {
  const listeners = new Map<string, Set<Listener>>();

  function subscribe(eventId: string, listener: Listener): () => void {
    const set = listeners.get(eventId) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(eventId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) listeners.delete(eventId);
    };
  }

  function publish(eventId: string, message: BusMessage): void {
    for (const listener of listeners.get(eventId) ?? []) {
      try {
        listener(message);
      } catch {
        // A closed stream must not stop delivery to the others.
      }
    }
  }

  return { subscribe, publish };
}

const globalForBus = globalThis as unknown as { realtimeBus?: ReturnType<typeof createBus> };

export const bus = (globalForBus.realtimeBus ??= createBus());

/** What a guest stream may receive: visible items without the original link; anything else is a removal. */
export function toGuestMessage(message: BusMessage): BusMessage {
  if (message.type === "remove") return message;
  if (message.item.moderation !== "VISIBLE") return { type: "remove", id: message.item.id };
  return message.item.type === "upload" ? { type: "item", item: { ...message.item, originalUrl: null } } : message;
}