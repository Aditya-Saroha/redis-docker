import { NextRequest, NextResponse } from "next/server";
import { kvZScore, kvZRem } from "@/lib/kvClient";
import { handleError } from "@/lib/apiError";

export const runtime = "nodejs";

type Params = { params: Promise<{ key: string; member: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { key, member } = await params;
    const score = await kvZScore(
      decodeURIComponent(key),
      decodeURIComponent(member)
    );
    if (score === null) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ key, member, score });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { key, member } = await params;
    const removed = await kvZRem(
      decodeURIComponent(key),
      decodeURIComponent(member)
    );
    return NextResponse.json({ removed });
  } catch (err) {
    return handleError(err);
  }
}
