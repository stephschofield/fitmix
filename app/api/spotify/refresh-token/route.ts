import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Get the refresh token from cookies
    const refreshToken = cookies().get("spotify_refresh_token")?.value

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token available" }, { status: 401 })
    }

    // Get environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json({ message: "Missing Spotify credentials" }, { status: 500 })
    }

    // Exchange refresh token for a new access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token refresh error:", errorText)
      return NextResponse.json({ message: "Failed to refresh token" }, { status: 400 })
    }

    const tokenData = await tokenResponse.json()

    // Update the access token cookie
    cookies().set("spotify_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: tokenData.expires_in,
      path: "/",
    })

    // If a new refresh token was provided, update that too
    if (tokenData.refresh_token) {
      cookies().set("spotify_refresh_token", tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      })
    }

    // Return the new access token for client-side use
    return NextResponse.json({
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    })
  } catch (error: any) {
    console.error("Token refresh error:", error)
    return NextResponse.json({ message: error.message || "Failed to refresh token" }, { status: 500 })
  }
}
