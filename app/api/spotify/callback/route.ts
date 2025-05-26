import { type NextRequest, NextResponse } from "next/server"

// In a real app, you would store these in environment variables
const SPOTIFY_CLIENT_ID = "your_client_id"
const SPOTIFY_CLIENT_SECRET = "your_client_secret"
const REDIRECT_URI = "http://localhost:3000/api/spotify/callback"

/**
 * This route handler processes the Spotify OAuth callback
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  // In a real app, validate state to prevent CSRF attacks

  if (!code) {
    return NextResponse.redirect("/login?error=spotify_auth_failed")
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token")
    }

    const tokenData = await tokenResponse.json()

    // In a real app, you would store tokens securely (e.g., in an encrypted cookie or database)
    // For demo purposes we'll just redirect with a success param

    return NextResponse.redirect("/dashboard?spotify_connected=true")
  } catch (error) {
    console.error("Spotify auth error:", error)
    return NextResponse.redirect("/login?error=spotify_auth_failed")
  }
}
