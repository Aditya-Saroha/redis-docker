"use client";

import { useEffect, useState } from "react";

// -2: key gone, -1: no expiry, else: ms remaining as of server render time
export function TtlBadge({ initialTtlMs }: { initialTtlMs: number }) {
  const [remaining, setRemaining] = useState(initialTtlMs);

  useEffect(() => {
    setRemaining(initialTtlMs);
  }, [initialTtlMs]);

  useEffect(() => {
    if (remaining <= 0) return; // nothing to count down for -1/-2/0
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining > 0]);

  return (
    <span className="font-mono text-xs text-muted">{format(remaining)}</span>
  );
}

function format(ttlMs: number): string {
  if (ttlMs === -2) return "gone";
  if (ttlMs === -1) return "no expiry";
  if (ttlMs <= 0) return "expired";
  const s = Math.ceil(ttlMs / 1000);
  if (s < 60) return `${s}s left`;
  const m = Math.ceil(s / 60);
  return `${m}m left`;
}
