import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, kvDel } from "@/lib/kvClient";
import { handleError } from "@/lib/apiError";

export const runtime = "nodejs";

type Params = { params: Promise<{ key: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const value = await kvGet(decodeURIComponent(key));
    if (value === null) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ key, value });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const body = await req.json();
    if (typeof body?.value !== "string") {
      return NextResponse.json(
        { error: "body must be { value: string }" },
        { status: 422 }
      );
    }
    await kvSet(decodeURIComponent(key), body.value);
    return NextResponse.json({ key, value: body.value });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    const deleted = await kvDel(decodeURIComponent(key));
    return NextResponse.json({ deleted });
  } catch (err) {
    return handleError(err);
  }
}
