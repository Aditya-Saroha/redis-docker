import { NextResponse } from "next/server";
import { KvError } from "@/lib/kvClient";

export function handleError(err: unknown): NextResponse {
  if (err instanceof KvError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: 400 }
    );
  }
  console.error(err);
  return NextResponse.json({ error: "internal error" }, { status: 500 });
}
