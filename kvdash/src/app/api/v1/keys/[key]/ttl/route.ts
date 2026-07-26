import { NextRequest, NextResponse } from "next/server";
import { kvPTTL, kvPExpire } from "@/lib/kvClient";
import { handleError } from "@/lib/apiError";

export const runtime = "nodejs";

type Params = { params: Promise<{ key: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const ttlMs = await kvPTTL(decodeURIComponent(key));
    return NextResponse.json({ key, ttlMs });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const body = await req.json();
    if (typeof body?.ttlMs !== "number") {
      return NextResponse.json(
        { error: "body must be { ttlMs: number }" },
        { status: 422 }
      );
    }
    const found = await kvPExpire(decodeURIComponent(key), body.ttlMs);
    if (!found) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ key, ttlMs: body.ttlMs });
  } catch (err) {
    return handleError(err);
  }
}
