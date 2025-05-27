"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugEnvPage() {
  const [clientVars, setClientVars] = useState({
    clientId: "",
    redirectUri: "",
    origin: "",
  })

  useEffect(() => {
    setClientVars({
      clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "Not set",
      redirectUri: `${window.location.origin}/spotify-callback`,
      origin: window.location.origin,
    })
  }, [])

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Client-side Environment Variables:</h3>
              <ul className="list-disc pl-5 mt-2">
                <li>NEXT_PUBLIC_SPOTIFY_CLIENT_ID: {clientVars.clientId}</li>
                <li>Computed Redirect URI: {clientVars.redirectUri}</li>
                <li>window.location.origin: {clientVars.origin}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Computed Redirect URI:</h3>
              <p className="mt-2 font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                {clientVars.redirectUri}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This is the exact URI that should be registered in your Spotify Developer Dashboard
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
