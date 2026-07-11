import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(code: string, message: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(fields ? { fields } : {})
      }
    },
    { status }
  );
}
