import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    // Generate a random state value for CSRF protection
    const state = Math.random().toString(36).substring(2, 15)

    // Store the state in a cookie for verification when the user returns
    cookies().set("spotify_auth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    })

    // Get environment variables directly
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI

    if (!clientId || !redirectUri) {
      console.error("Missing required Spotify environment variables")
      return NextResponse.redirect(new URL("/login?error=missing_env_vars", "http://localhost:3000"))
    }

    // Define scopes for Spotify API access
    const scopes = [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "playlist-modify-private",
      "playlist-modify-public",
      "streaming", // For Web Playback SDK
      "user-read-playback-state", // Add this scope for audio features
    ].join(" ")

    // Build the authorization URL directly in this file
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    })

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    // Redirect to Spotify's authorization page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Error initiating Spotify auth:", error)
    return NextResponse.redirect(new URL("/login?error=auth_init_failed", "http://localhost:3000"))
  }
}
