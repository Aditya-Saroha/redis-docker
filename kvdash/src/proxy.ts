import { NextRequest, NextResponse } from "next/server";

// Only /api/v1/* is the public REST surface -- Server Actions used by the
// dashboard pages don't go through HTTP routes, so they're unaffected by
// this. See lib/kvClient.ts for the actual protocol implementation.
//
// Named `proxy` per Next.js 16's rename of the middleware convention --
// see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
export function proxy(req: NextRequest) {
  const apiKey = process.env.KV_API_KEY;
  if (!apiKey) {
    // fail closed: an unset API key means the route is misconfigured, not open
    return NextResponse.json(
      { error: "server misconfigured: KV_API_KEY not set" },
      { status: 500 }
    );
  }
  const provided = req.headers.get("x-api-key");
  if (provided !== apiKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/v1/:path*",
};
