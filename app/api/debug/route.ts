import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Get environment variables for debugging
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI

  // Check if redirect URI is properly formatted
  let redirectUriValid = false
  if (redirectUri) {
    try {
      const url = new URL(redirectUri)
      redirectUriValid = url.protocol === "https:" || url.hostname === "localhost"
    } catch (e) {
      redirectUriValid = false
    }
  }

  // Return debug info without exposing secrets
  return NextResponse.json({
    clientIdExists: !!clientId,
    clientSecretExists: !!clientSecret,
    redirectUri,
    redirectUriValid,
  })
}
