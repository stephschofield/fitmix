"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Music2, AlertCircle, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for error parameters in the URL
  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      let errorMessage = "An error occurred during authentication"

      switch (errorParam) {
        case "state_mismatch":
          errorMessage = "Security validation failed. Please try again."
          break
        case "no_code":
          errorMessage = "Authorization code missing. Please try again."
          break
        case "auth_failed":
          errorMessage = "Authentication failed. Please try again."
          break
        case "missing_env_vars":
          errorMessage = "Missing Spotify configuration. Please contact support."
          break
        case "token_exchange_failed":
          errorMessage = "Failed to authenticate with Spotify. Please try again."
          break
        case "profile_fetch_failed":
          errorMessage = "Failed to fetch your Spotify profile. Please try again."
          break
        default:
          errorMessage = `Authentication error: ${errorParam}`
      }

      setError(errorMessage)
    }
  }, [searchParams])

  const handleSpotifyLogin = async () => {
    setIsLoading(true)
    // Redirect to our client-side auth page
    router.push("/spotify-auth")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-pink-950 dark:via-purple-950 dark:to-blue-950">
      <Card className="mx-auto max-w-sm border-none shadow-lg shadow-pink-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-2 rounded-lg">
              <Music2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
            Login to FitMix
          </CardTitle>
          <CardDescription>Connect with your Spotify account to create perfect workout playlists</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full bg-[#1DB954] hover:bg-[#1aa34a] shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
            onClick={handleSpotifyLogin}
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Connecting..." : "Continue with Spotify"}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
