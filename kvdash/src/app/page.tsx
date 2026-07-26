import Link from "next/link";
import { kvKeys, kvPTTL } from "@/lib/kvClient";
import { setKeyAction, deleteKeyAction } from "./actions";

export const dynamic = "force-dynamic";

function formatTtl(ttlMs: number): string {
  if (ttlMs === -2) return "gone";
  if (ttlMs === -1) return "no expiry";
  const s = Math.ceil(ttlMs / 1000);
  if (s < 60) return `${s}s left`;
  const m = Math.ceil(s / 60);
  return `${m}m left`;
}

export default async function KeysPage() {
  let keys: string[] = [];
  let connError: string | null = null;
  try {
    keys = await kvKeys();
  } catch (err) {
    connError = err instanceof Error ? err.message : "could not reach the KV store";
  }

  const rows = connError
    ? []
    : await Promise.all(
        keys.map(async (key) => {
          let ttl = -1;
          try {
            ttl = await kvPTTL(key);
          } catch {
            // leave as -1 if the ttl lookup itself fails
          }
          return { key, ttl };
        })
      );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-medium">Keys</h1>
        <p className="text-sm text-muted mt-1">
          {connError
            ? "Not connected to the KV store."
            : `${rows.length} key${rows.length === 1 ? "" : "s"} currently stored.`}
        </p>
      </div>

      {connError && (
        <div className="rounded-lg border border-border-hairline bg-surface px-4 py-3 text-sm">
          <span className="font-mono text-red-700">{connError}</span>
          <p className="text-muted mt-1">
            Check that the KV store server is running and that KV_HOST/KV_PORT
            are set correctly.
          </p>
        </div>
      )}

      <section className="rounded-lg border border-border-hairline bg-surface overflow-hidden">
        {rows.length === 0 && !connError && (
          <p className="px-4 py-6 text-sm text-muted">
            No keys yet. Create one below.
          </p>
        )}
        <ul className="divide-y divide-border-hairline">
          {rows.map(({ key, ttl }) => (
            <li key={key} className="flex items-center justify-between px-4 py-3">
              <Link
                href={`/keys/${encodeURIComponent(key)}`}
                className="font-mono text-sm hover:text-accent"
              >
                {key}
              </Link>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted">
                  {formatTtl(ttl)}
                </span>
                <form action={deleteKeyAction}>
                  <input type="hidden" name="key" value={key} />
                  <button
                    type="submit"
                    className="text-xs text-muted hover:text-red-700"
                  >
                    delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border-hairline bg-surface p-4">
        <h2 className="text-sm font-medium mb-3">Set a key</h2>
        <form action={setKeyAction} className="flex flex-col gap-3 sm:flex-row">
          <input
            name="key"
            placeholder="key"
            required
            className="flex-1 rounded-md border border-border-hairline px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            name="value"
            placeholder="value"
            required
            className="flex-1 rounded-md border border-border-hairline px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium"
          >
            Set
          </button>
        </form>
      </section>
    </div>
  );
}
