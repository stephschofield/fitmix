"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DebugPage() {
  const [clientVars, setClientVars] = useState({
    clientId: "",
    redirectUri: "",
    origin: "",
  })

  const [serverVars, setServerVars] = useState({
    clientIdExists: false,
    clientSecretExists: false,
    redirectUri: "",
    redirectUriValid: false,
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get client-side environment variables
    setClientVars({
      clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "Not set",
      redirectUri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "Not set",
      origin: window.location.origin,
    })

    // Fetch server-side environment variables
    async function fetchServerVars() {
      try {
        const response = await fetch("/api/debug")
        if (response.ok) {
          const data = await response.json()
          setServerVars(data)
        }
      } catch (error) {
        console.error("Error fetching debug info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServerVars()
  }, [])

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Spotify OAuth Debug</CardTitle>
          <CardDescription>This page helps diagnose issues with Spotify OAuth integration</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading debug information...</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-lg mb-2">Client-side Environment Variables:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>NEXT_PUBLIC_SPOTIFY_CLIENT_ID: {clientVars.clientId}</li>
                  <li>NEXT_PUBLIC_SPOTIFY_REDIRECT_URI: {clientVars.redirectUri}</li>
                  <li>window.location.origin: {clientVars.origin}</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Computed client redirect URI: {clientVars.redirectUri || `${clientVars.origin}/spotify-callback`}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Server-side Environment Variables:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>SPOTIFY_CLIENT_ID: {serverVars.clientIdExists ? "✅ Exists" : "❌ Missing"}</li>
                  <li>SPOTIFY_CLIENT_SECRET: {serverVars.clientSecretExists ? "✅ Exists" : "❌ Missing"}</li>
                  <li>SPOTIFY_REDIRECT_URI: {serverVars.redirectUri || "❌ Missing"}</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Redirect URI valid: {serverVars.redirectUriValid ? "✅ Yes" : "❌ No"}
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-md">
                <h3 className="font-medium text-lg mb-2">Troubleshooting Tips:</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Make sure both client and server environment variables are set correctly</li>
                  <li>Verify that the redirect URI exactly matches what's in your Spotify Developer Dashboard</li>
                  <li>Check that your Spotify app has the correct redirect URI registered</li>
                  <li>Ensure your Spotify Client ID and Client Secret are correct</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <div className="space-x-2">
            <Link href="/spotify-auth">
              <Button variant="outline">Test Auth Flow</Button>
            </Link>
            <Link href="https://developer.spotify.com/dashboard" target="_blank">
              <Button>Spotify Dashboard</Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
