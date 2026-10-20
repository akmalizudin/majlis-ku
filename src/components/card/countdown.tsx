"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

export function Countdown({
  target,
  color,
  labels,
}: {
  target: string;
  color: string;
  labels: { days: string; hours: string; minutes: string; seconds: string; started: string };
}) {
  // Rendered on the server as the static time left; the client then ticks every second.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = new Date(target).getTime() - (now ?? new Date(target).getTime() - 1);
  if (now !== null && left <= 0) return <p className="text-center text-sm opacity-80">{labels.started}</p>;
  const p = parts(now === null ? 0 : left);
  const cells: [number, string][] = [
    [p.days, labels.days],
    [p.hours, labels.hours],
    [p.minutes, labels.minutes],
    [p.seconds, labels.seconds],
  ];
  return (
    <div className="grid grid-cols-4 gap-2 text-center" role="timer" aria-live="off" data-testid="countdown">
      {cells.map(([value, label]) => (
        <div key={label} className="rounded-2xl bg-white/70 px-1 py-3">
          <span className="block text-3xl font-semibold tabular-nums" style={{ color }}>
            {now === null ? "–" : String(value).padStart(2, "0")}
          </span>
          <span className="text-xs tracking-wide uppercase opacity-70">{label}</span>
        </div>
      ))}
    </div>
  );
}