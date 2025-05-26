"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SpotifyCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get query parameters
        const code = searchParams.get("code")
        const state = searchParams.get("state")
        const spotifyError = searchParams.get("error")

        // Get the stored state from localStorage
        const storedState = localStorage.getItem("spotify_auth_state")

        // Collect debug info
        setDebugInfo({
          code: code ? "✅ Present" : "❌ Missing",
          state,
          storedState,
          spotifyError,
          hasStateMatch: state && storedState && state === storedState ? "✅ Yes" : "❌ No",
        })

        // Check for error from Spotify
        if (spotifyError) {
          setError(`Spotify error: ${spotifyError}`)
          setIsProcessing(false)
          return
        }

        // Validate state to prevent CSRF attacks
        if (!state || !storedState || state !== storedState) {
          setError("Security validation failed. Please try again.")
          setIsProcessing(false)
          return
        }

        // Clear the state from localStorage
        localStorage.removeItem("spotify_auth_state")

        if (!code) {
          setError("Authorization code missing. Please try again.")
          setIsProcessing(false)
          return
        }

        // Exchange the code for tokens using a server action or API route
        const response = await fetch("/api/spotify/exchange-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        })

        // Log the response for debugging
        console.log("Token exchange response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to exchange token")
        }

        const data = await response.json()

        // Store user data in localStorage for client access
        if (data.user) {
          localStorage.setItem("user_data", JSON.stringify(data.user))
        }

        // Store access token in localStorage for API calls
        if (data.accessToken) {
          localStorage.setItem("spotify_access_token", data.accessToken)
        }

        // Redirect to dashboard
        router.push("/dashboard")
      } catch (err: any) {
        console.error("Callback error:", err)
        setError(err.message || "Authentication failed. Please try again.")
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-pink-950 dark:via-purple-950 dark:to-blue-950">
      <div className="max-w-md w-full p-6 bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-lg shadow-lg">
        {isProcessing ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Processing your login...</h1>
            <p className="mb-4">Please wait while we complete your authentication.</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            {/* Debug information */}
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm">
              <h3 className="font-bold mb-2">Debug Information:</h3>
              <ul className="space-y-1">
                {Object.entries(debugInfo).map(([key, value]) => (
                  <li key={key}>
                    {key}: {String(value)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <Button onClick={() => router.push("/login")}>Back to Login</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
