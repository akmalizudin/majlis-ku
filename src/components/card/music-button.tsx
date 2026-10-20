"use client";

import { useRef, useState } from "react";

/** Music never autoplays: the guest taps to start it. */
export function MusicButton({ src, labels, color }: { src: string; labels: { play: string; pause: string }; color: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <audio ref={audio} src={src} loop preload="none" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <button
        type="button"
        onClick={() => (playing ? audio.current?.pause() : void audio.current?.play().catch(() => undefined))}
        className="fixed right-4 bottom-4 z-10 flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-medium text-white shadow-lg"
        style={{ backgroundColor: color }}
        aria-pressed={playing}
      >
        <span aria-hidden>{playing ? "❚❚" : "♪"}</span>
        {playing ? labels.pause : labels.play}
      </button>
    </>
  );
}