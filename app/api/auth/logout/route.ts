import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  // Clear all auth cookies
  cookies().delete("spotify_access_token")
  cookies().delete("spotify_refresh_token")
  cookies().delete("user_data")

  // Redirect to home page
  return NextResponse.redirect(new URL("/", request.url))
}
