import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED = new Set(["fr", "en"]);

export async function POST(request) {
  const { locale } = await request.json().catch(() => ({}));
  if (!ALLOWED.has(locale)) {
    return NextResponse.json({ error: "unsupported locale" }, { status: 400 });
  }
  const jar = await cookies();
  jar.set("locale", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true, locale });
}
