import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Get the stored state from cookies
    const storedState = cookies().get("spotify_auth_state")?.value

    // Check for error from Spotify
    if (error) {
      console.error("Spotify returned an error:", error)
      return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
    }

    // Validate state to prevent CSRF attacks
    if (!state || state !== storedState) {
      console.error("State mismatch")
      return NextResponse.redirect(new URL("/login?error=state_mismatch", request.url))
    }

    // Clear the state cookie
    cookies().delete("spotify_auth_state")

    if (!code) {
      console.error("No code provided in callback")
      return NextResponse.redirect(new URL("/login?error=no_code", request.url))
    }

    // Get environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("Missing required Spotify environment variables")
      return NextResponse.redirect(new URL("/login?error=missing_env_vars", request.url))
    }

    // Exchange the code for an access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenResponse.status)
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url))
    }

    const tokenData = await tokenResponse.json()

    // Get the user's Spotify profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!profileResponse.ok) {
      console.error("Profile fetch failed:", profileResponse.status)
      return NextResponse.redirect(new URL("/login?error=profile_fetch_failed", request.url))
    }

    const userProfile = await profileResponse.json()

    // Store the tokens and user data in cookies
    cookies().set("spotify_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: tokenData.expires_in,
      path: "/",
    })

    cookies().set("spotify_refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    })

    // Store basic user info in a non-httpOnly cookie so client can access it
    cookies().set(
      "user_data",
      JSON.stringify({
        id: userProfile.id,
        name: userProfile.display_name,
        email: userProfile.email,
        image: userProfile.images?.[0]?.url,
      }),
      {
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      },
    )

    // Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("Spotify auth error:", error)
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url))
  }
}
