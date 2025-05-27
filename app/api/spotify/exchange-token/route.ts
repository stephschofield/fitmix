import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    // Log for debugging
    console.log("Received code for token exchange")

    // Get environment variables
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = `${request.nextUrl.origin}/spotify-callback`

    // Log environment variables (without exposing secrets)
    console.log("Client ID exists:", !!clientId)
    console.log("Client Secret exists:", !!clientSecret)
    console.log("Redirect URI:", redirectUri)

    if (!clientId || !clientSecret) {
      console.error("Missing Spotify credentials")
      return NextResponse.json({ message: "Missing Spotify credentials" }, { status: 500 })
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

    // Log token response status
    console.log("Token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token exchange error:", errorText)
      return NextResponse.json({ message: `Failed to exchange token with Spotify: ${errorText}` }, { status: 400 })
    }

    const tokenData = await tokenResponse.json()
    console.log("Token exchange successful")

    // Get the user's Spotify profile
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    // Log profile response status
    console.log("Profile response status:", profileResponse.status)

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error("Profile fetch error:", errorText)
      return NextResponse.json({ message: "Failed to fetch Spotify profile" }, { status: 400 })
    }

    const userProfile = await profileResponse.json()
    console.log("Profile fetch successful")

    // Store the tokens in HTTP-only cookies
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

    // Store user data in a non-httpOnly cookie so client can access it
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

    // Return user data and access token to be stored on the client
    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.display_name,
        email: userProfile.email,
        image: userProfile.images?.[0]?.url,
      },
      accessToken: tokenData.access_token,
    })
  } catch (error: any) {
    console.error("Token exchange error:", error)
    return NextResponse.json({ message: error.message || "Authentication failed" }, { status: 500 })
  }
}
