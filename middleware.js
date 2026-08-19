import { NextResponse } from "next/server";
import { SETTINGS_COOKIE, settingsAuthEnabled, isValidSessionCookie } from "@/lib/settingsAuth";

// Gate access to /settings and /api/settings behind a password, when one is
// configured (SETTINGS_PASSWORD env var). Everything else in the app (trips,
// share links, Gmail import) is untouched — this only protects the page where
// API keys and Gmail credentials are managed.
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow the login/logout endpoints themselves, or nothing would ever
  // let a visitor authenticate.
  if (
    pathname === "/settings/login" ||
    pathname === "/api/settings/login" ||
    pathname === "/api/settings/logout"
  ) {
    return NextResponse.next();
  }

  if (!settingsAuthEnabled()) return NextResponse.next();

  const cookie = request.cookies.get(SETTINGS_COOKIE)?.value;
  const authed = await isValidSessionCookie(cookie);
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Settings access requires login." }, { status: 401 });
  }

  const loginUrl = new URL("/settings/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/settings", "/settings/:path*", "/api/settings", "/api/settings/:path*"],
};
