import { type NextRequest, NextResponse } from "next/server"

// In a real app, you would store these in environment variables
const SPOTIFY_CLIENT_ID = "your_client_id"
const SPOTIFY_CLIENT_SECRET = "your_client_secret"
const REDIRECT_URI = "http://localhost:3000/api/spotify/callback"

/**
 * This route handler initiates Spotify OAuth flow
 */
export async function GET(request: NextRequest) {
  const scope = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
  ].join(" ")

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
    state: Math.random().toString(36).substring(2, 15),
  })

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`)
}
