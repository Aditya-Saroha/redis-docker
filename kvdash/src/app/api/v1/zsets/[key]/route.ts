import { NextRequest, NextResponse } from "next/server";
import { kvZQuery, kvZAdd } from "@/lib/kvClient";
import { handleError } from "@/lib/apiError";

export const runtime = "nodejs";

type Params = { params: Promise<{ key: string }> };

// GET /api/v1/zsets/:key?score=0&name=&offset=0&limit=20
// Mirrors the server's ZQUERY: seeks to (score, name), then walks `limit`
// entries forward from `offset`.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const sp = req.nextUrl.searchParams;
    const scoreParam = sp.get("score");
    // no score given -> start from the lowest possible score
    const score = scoreParam !== null ? Number(scoreParam) : -1e18;
    const name = sp.get("name") ?? "";
    const offset = Number(sp.get("offset") ?? "0");
    const limit = Number(sp.get("limit") ?? "20");
    const members = await kvZQuery(
      decodeURIComponent(key),
      score,
      name,
      offset,
      limit
    );
    return NextResponse.json({ key, members });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const body = await req.json();
    if (typeof body?.score !== "number" || typeof body?.member !== "string") {
      return NextResponse.json(
        { error: "body must be { score: number, member: string }" },
        { status: 422 }
      );
    }
    const added = await kvZAdd(decodeURIComponent(key), body.score, body.member);
    return NextResponse.json({ key, member: body.member, score: body.score, added });
  } catch (err) {
    return handleError(err);
  }
}
