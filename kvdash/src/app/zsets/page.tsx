export default function ZsetsIndexPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Sorted sets</h1>
      <p className="text-sm text-muted">
        Sorted sets don&apos;t have a listing command in the wire protocol --
        open one directly by name.
      </p>
      <ZsetJumpForm />
    </div>
  );
}

function ZsetJumpForm() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const { redirect } = await import("next/navigation");
        const key = String(formData.get("key") ?? "").trim();
        if (key) redirect(`/zsets/${encodeURIComponent(key)}`);
      }}
      className="flex gap-3"
    >
      <input
        name="key"
        placeholder="zset key"
        required
        className="flex-1 rounded-md border border-border-hairline px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium"
      >
        Open
      </button>
    </form>
  );
}
