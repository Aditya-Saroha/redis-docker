import Link from "next/link";
import { kvZQuery } from "@/lib/kvClient";
import { zAddAction, zRemAction } from "../../actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

export default async function ZsetDetailPage({ params }: Params) {
  const { key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);

  let members: { name: string; score: number }[] = [];
  let error: string | null = null;
  try {
    members = await kvZQuery(key, -1e18, "", 0, 200);
  } catch (err) {
    error = err instanceof Error ? err.message : "failed to query zset";
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/zsets" className="text-sm text-muted hover:text-foreground">
          &larr; sorted sets
        </Link>
        <h1 className="text-lg font-medium font-mono mt-2">{key}</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-border-hairline bg-surface px-4 py-3 text-sm">
          <span className="font-mono text-red-700">{error}</span>
        </div>
      )}

      <section className="rounded-lg border border-border-hairline bg-surface overflow-hidden">
        {members.length === 0 && !error && (
          <p className="px-4 py-6 text-sm text-muted">
            No members yet -- this key may not exist, or exists but is empty.
          </p>
        )}
        <ul className="divide-y divide-border-hairline">
          {members.map((m) => (
            <li key={m.name} className="flex items-center justify-between px-4 py-3">
              <span className="font-mono text-sm">{m.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted">{m.score}</span>
                <form action={zRemAction}>
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="member" value={m.name} />
                  <button
                    type="submit"
                    className="text-xs text-muted hover:text-red-700"
                  >
                    remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border-hairline bg-surface p-4">
        <h2 className="text-sm font-medium mb-3">Add a member</h2>
        <form action={zAddAction} className="flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="key" value={key} />
          <input
            name="member"
            placeholder="member name"
            required
            className="flex-1 rounded-md border border-border-hairline px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            name="score"
            type="number"
            step="any"
            placeholder="score"
            required
            className="w-40 rounded-md border border-border-hairline px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium"
          >
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
