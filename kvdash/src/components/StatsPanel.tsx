"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { KvStats } from "@/lib/kvClient";

interface OpsPoint {
  t: number;
  ops: number;
}

export function StatsPanel() {
  const [stats, setStats] = useState<KvStats | null>(null);
  const [history, setHistory] = useState<OpsPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        setError(null);
        setStats(data);
        setHistory((prev) => [
          ...prev.slice(-29),
          { t: Date.now(), ops: data.opsPerSec },
        ]);
      } catch {
        if (!cancelled) setError("failed to reach stats endpoint");
      }
    }

    poll();
    const id = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-border-hairline bg-surface px-4 py-3 text-sm">
        <span className="font-mono text-red-700">{error}</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-border-hairline bg-surface px-4 py-3 text-sm text-muted">
        Loading stats...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border-hairline bg-surface p-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <XAxis dataKey="t" hide />
            <YAxis width={32} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={() => "ops/sec"}
              contentStyle={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="ops"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Connections" value={stats.connections} />
        <Stat label="Ops/sec" value={stats.opsPerSec} />
        <Stat label="Keys" value={stats.keys} />
        <Stat label="Memory (KB)" value={stats.memoryKb} />
        <Stat label="Total ops" value={stats.totalOps} />
        <Stat label="Uptime" value={formatUptime(stats.uptimeMs)} />
      </div>
    </div>
  );
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border-hairline bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-mono font-medium">{value}</div>
    </div>
  );
}
