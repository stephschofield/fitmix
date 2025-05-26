"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Search, Music, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BeatDetektorAnalyzer } from "@/components/beat-detektor-analyzer"
import { searchSpotifyTracks } from "@/lib/spotify-search"
import Image from "next/image"

export default function BPMAnalyzerPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null)
  const [adminMode, setAdminMode] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    try {
      setIsSearching(true)
      setError(null)

      const results = await searchSpotifyTracks(searchQuery, 10)
      setSearchResults(results)

      if (results.length === 0) {
        setError("No tracks found matching your search")
      }
    } catch (err: any) {
      console.error("Search error:", err)
      setError(err.message || "Failed to search for tracks")
    } finally {
      setIsSearching(false)
    }
  }

  const selectTrack = (track: any) => {
    setSelectedTrack(track)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="font-bold text-xl">Beat Analyzer</div>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Analyze Song BPM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search for a song</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      placeholder="Enter song name or artist"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isSearching}>
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span className="ml-2">Search</span>
                    </Button>
                  </div>
                </div>
              </form>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {searchResults.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium">Search Results</h3>
                  <div className="grid gap-2">
                    {searchResults.map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                          selectedTrack?.id === track.id ? "bg-muted" : ""
                        }`}
                        onClick={() => selectTrack(track)}
                      >
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                          <Image
                            src={track.album.images[0]?.url || "/placeholder.svg?height=40&width=40"}
                            alt={track.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{track.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {track.artists.map((a: any) => a.name).join(", ")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectTrack(track)
                          }}
                        >
                          Analyze
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedTrack && (
            <BeatDetektorAnalyzer
              trackId={selectedTrack.id}
              trackName={selectedTrack.name}
              artistName={selectedTrack.artists.map((a: any) => a.name).join(", ")}
              previewUrl={selectedTrack.preview_url}
              adminMode={adminMode}
            />
          )}
        </div>

        <div className="mt-12 border-t pt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdminMode(!adminMode)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {adminMode ? "Disable Admin Mode" : "Enable Admin Mode"}
          </Button>
        </div>
      </main>
    </div>
  )
}
