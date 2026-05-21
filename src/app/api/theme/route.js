// Persist the user's theme choice in a cookie. Read by RootLayout in the
// next request so the server-rendered <html data-theme=...> matches.
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";

const Schema = z.object({
  theme: z.enum(["light", "dark", "auto"]),
});

export async function POST(request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const jar = await cookies();
  jar.set("theme", parsed.data.theme, {
    httpOnly: false, // readable from JS so the picker is in sync
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return NextResponse.json({ ok: true });
}
