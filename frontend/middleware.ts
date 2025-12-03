import { updateSession } from "./lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 🔥 Allow API routes to run without Supabase auth OR redirects
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Proceed with Supabase session handling for everything else
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
