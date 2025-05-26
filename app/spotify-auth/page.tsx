"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function SpotifyAuthPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    try {
      // Collect debug info
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
      const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || `${window.location.origin}/spotify-callback`

      setDebugInfo({
        clientId: clientId ? "✅ Set" : "❌ Missing",
        redirectUri,
        origin: window.location.origin,
      })

      // If missing client ID, show error and return
      if (!clientId) {
        setError("Missing Spotify Client ID. Please check your environment variables.")
        return
      }

      // Generate a random state value for CSRF protection
      const state = Math.random().toString(36).substring(2, 15)

      // Store the state in localStorage
      localStorage.setItem("spotify_auth_state", state)

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

      // Build the authorization URL
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        scope: scopes,
        redirect_uri: redirectUri,
        state,
      })

      const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

      // Log the URL we're redirecting to (for debugging)
      console.log("Redirecting to:", authUrl)

      // Redirect to Spotify's authorization page
      window.location.href = authUrl
    } catch (err: any) {
      console.error("Error in Spotify auth:", err)
      setError(err.message || "An error occurred during Spotify authorization")
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-pink-950 dark:via-purple-950 dark:to-blue-950">
      <div className="max-w-md w-full p-6 bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-lg shadow-lg">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Redirecting to Spotify...</h1>
            <p className="mb-4">Please wait while we connect you to Spotify.</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        )}

        {/* Debug information - only shown when there's an error */}
        {error && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm">
            <h3 className="font-bold mb-2">Debug Information:</h3>
            <ul className="space-y-1">
              <li>Client ID: {debugInfo.clientId}</li>
              <li>Redirect URI: {debugInfo.redirectUri}</li>
              <li>Origin: {debugInfo.origin}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
