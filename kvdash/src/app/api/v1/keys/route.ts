import { NextResponse } from "next/server";
import { kvKeys } from "@/lib/kvClient";
import { handleError } from "@/lib/apiError";

export const runtime = "nodejs";

export async function GET() {
  try {
    const keys = await kvKeys();
    return NextResponse.json({ keys });
  } catch (err) {
    return handleError(err);
  }
}