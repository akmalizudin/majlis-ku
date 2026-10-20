"use client";
/* eslint-disable @next/next/no-img-element -- signed, short-lived media URLs */

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryItem } from "@/server/gallery/items";
import { nextSlide } from "./order";

const SLIDE_MS = 7000;
const MAX_VIDEO_MS = 20_000;
const REFRESH_MS = 20 * 60 * 1000;

type Labels = { scan: string; empty: string; fullscreen: string; by: string };

function showable(item: GalleryItem): boolean {
  return item.moderation === "VISIBLE" && (item.type === "wish" || item.kind === "PHOTO" || item.kind === "VIDEO");
}

export function Slideshow({
  eventId,
  hostNames,
  themeColor,
  initialItems,
  qrSrc,
  shareUrl,
  labels,
}: {
  eventId: string;
  hostNames: string;
  themeColor: string;
  initialItems: GalleryItem[];
  qrSrc: string;
  shareUrl: string;
  labels: Labels;
}) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems.filter(showable));
  const [current, setCurrent] = useState(0);
  const queue = useRef<string[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const advance = useCallback(() => {
    const list = itemsRef.current;
    setCurrent((index) => {
      const next = nextSlide({ ids: list.map((i) => i.id), current: index, queue: queue.current });
      queue.current = next.queue;
      return next.current;
    });
  }, []);

  const item = items[current] ?? items[0];

  // Photos and wishes advance on a timer; videos when they end (or after 20 s).
  useEffect(() => {
    if (!item) return;
    const delay = item.type === "upload" && item.kind === "VIDEO" ? MAX_VIDEO_MS : SLIDE_MS;
    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [item, advance]);

  // Live arrivals jump the queue; hidden or removed items disappear.
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(`/api/events/${eventId}/stream`);
    source.addEventListener("item", (event) => {
      const { item: incoming } = JSON.parse((event as MessageEvent<string>).data) as { item: GalleryItem };
      if (!showable(incoming)) {
        setItems((list) => list.filter((i) => i.id !== incoming.id));
        return;
      }
      setItems((list) => (list.some((i) => i.id === incoming.id) ? list : [incoming, ...list]));
      queue.current = [...queue.current, incoming.id];
      // The list grew at the front, so the current slide moved one place.
      setCurrent((index) => (itemsRef.current.some((i) => i.id === incoming.id) ? index : index + 1));
    });
    source.addEventListener("remove", (event) => {
      const { id } = JSON.parse((event as MessageEvent<string>).data) as { id: string };
      setItems((list) => list.filter((i) => i.id !== id));
    });
    return () => source.close();
  }, [eventId]);

  // Signed URLs expire after an hour: fetch fresh ones every 20 minutes.
  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch(`/api/events/${eventId}/slideshow`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const { items: fresh } = (await response.json()) as { items: GalleryItem[] };
      const currentId = itemsRef.current[current]?.id;
      const list = fresh.filter(showable);
      setItems(list);
      const index = list.findIndex((i) => i.id === currentId);
      setCurrent(index >= 0 ? index : 0);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [eventId, current]);

  // Preload the next photo so the change is instant.
  useEffect(() => {
    const next = items[(current + 1) % Math.max(items.length, 1)];
    if (next?.type === "upload" && next.kind === "PHOTO" && next.displayUrl) {
      const img = new Image();
      img.src = next.displayUrl;
    }
  }, [items, current]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white" style={{ cursor: "none" }} data-testid="slideshow">
      <div className="absolute inset-0 flex items-center justify-center p-6 pb-28">
        {!item ? (
          <p className="text-3xl opacity-70">{labels.empty}</p>
        ) : item.type === "wish" ? (
          <figure key={item.id} className="max-w-4xl text-center">
            <blockquote className="font-serif text-4xl leading-snug md:text-6xl">“{item.message}”</blockquote>
            <figcaption className="mt-8 text-2xl opacity-80">{labels.by.replace("{name}", item.guestName)}</figcaption>
          </figure>
        ) : item.kind === "VIDEO" ? (
          <video
            key={item.id}
            src={item.displayUrl ?? undefined}
            poster={item.thumbUrl ?? undefined}
            autoPlay
            muted
            playsInline
            onEnded={advance}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <img key={item.id} src={item.displayUrl ?? item.thumbUrl ?? ""} alt="" className="max-h-full max-w-full object-contain" />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div>
          <p className="font-serif text-3xl" style={{ color: themeColor === "#000000" ? "#fff" : undefined }}>
            {hostNames}
          </p>
          {item && item.type === "upload" ? <p className="mt-1 text-xl opacity-80">{labels.by.replace("{name}", item.guestName)}</p> : null}
        </div>
        <div className="flex items-end gap-3 text-right">
          <div>
            <p className="max-w-56 text-lg leading-tight">{labels.scan}</p>
            <p className="mt-1 text-sm opacity-70">{shareUrl.replace(/^https?:\/\//, "")}</p>
          </div>
          <img src={qrSrc} alt="" className="size-28 rounded-lg bg-white p-1" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}
        className="absolute top-4 right-4 rounded-full bg-white/10 px-4 py-2 text-sm opacity-60 hover:opacity-100"
        style={{ cursor: "pointer" }}
      >
        {labels.fullscreen}
      </button>
    </div>
  );
}