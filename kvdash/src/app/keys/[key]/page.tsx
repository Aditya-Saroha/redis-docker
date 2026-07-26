import Link from "next/link";
import { notFound } from "next/navigation";
import { kvGet, kvPTTL } from "@/lib/kvClient";
import { setKeyAction, deleteKeyAction, setTtlAction } from "../../actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

export default async function KeyDetailPage({ params }: Params) {
  const { key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);

  const value = await kvGet(key);
  if (value === null) {
    notFound();
  }
  const ttlMs = await kvPTTL(key);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; all keys
        </Link>
        <h1 className="text-lg font-medium font-mono mt-2">{key}</h1>
      </div>

      <section className="rounded-lg border border-border-hairline bg-surface p-4">
        <h2 className="text-sm font-medium mb-3">Value</h2>
        <form action={setKeyAction} className="flex flex-col gap-3">
          <input type="hidden" name="key" value={key} />
          <textarea
            name="value"
            defaultValue={value}
            rows={4}
            className="rounded-md border border-border-hairline px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium"
            >
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border-hairline bg-surface p-4">
        <h2 className="text-sm font-medium mb-3">Expiry</h2>
        <p className="text-sm text-muted font-mono mb-3">
          {ttlMs === -1 ? "no expiry set" : `${Math.ceil(ttlMs / 1000)}s remaining`}
        </p>
        <form action={setTtlAction} className="flex items-center gap-3">
          <input type="hidden" name="key" value={key} />
          <input
            name="ttlMs"
            type="number"
            placeholder="ttl in ms"
            required
            className="w-40 rounded-md border border-border-hairline px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-md border border-border-hairline px-4 py-2 text-sm font-medium hover:bg-background"
          >
            Set expiry
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-red-200 bg-surface p-4">
        <h2 className="text-sm font-medium mb-3 text-red-700">Danger zone</h2>
        <form action={deleteKeyAction}>
          <input type="hidden" name="key" value={key} />
          <button
            type="submit"
            className="rounded-md border border-red-200 text-red-700 px-4 py-2 text-sm font-medium hover:bg-red-50"
          >
            Delete this key
          </button>
        </form>
      </section>
    </div>
  );
}
