"use client"

import { useState, useEffect } from "react"
import { fetchUserPlaylists } from "@/lib/spotify-client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Music2, RefreshCw, Import, Edit } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

export default function SpotifyPlaylistView() {
  const { toast } = useToast()
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPlaylists = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const spotifyPlaylists = await fetchUserPlaylists()
      setPlaylists(spotifyPlaylists)
    } catch (err: any) {
      console.error("Error loading playlists:", err)
      setError(err.message || "Failed to load your Spotify playlists")
      toast({
        title: "Error",
        description: err.message || "Failed to load your Spotify playlists",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPlaylists()
  }, [])

  const handleImportPlaylist = (playlist: any) => {
    // In a real app, this would import the playlist to your app's database
    toast({
      title: "Playlist imported",
      description: `"${playlist.name}" has been imported to your FitMix account`,
    })
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <Music2 className="h-12 w-12 text-pink-500 opacity-50" />
          <h3 className="text-xl font-semibold">Couldn't load your playlists</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={loadPlaylists} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  if (playlists.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <Music2 className="h-12 w-12 text-pink-500 opacity-50" />
          <h3 className="text-xl font-semibold">No Spotify playlists found</h3>
          <p className="text-muted-foreground">Connect your Spotify account to see your playlists here.</p>
          <div className="flex gap-2">
            <Button onClick={() => window.open("https://open.spotify.com/", "_blank")} className="gap-2">
              <Music2 className="h-4 w-4" />
              Open Spotify
            </Button>
            <Button variant="outline" onClick={loadPlaylists} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Spotify Playlists</h2>
          <p className="text-sm text-muted-foreground">Select a playlist to add workout time markers</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={loadPlaylists}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((playlist) => (
          <Card
            key={playlist.id}
            className="overflow-hidden border-none shadow-lg shadow-pink-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm hover:shadow-xl hover:shadow-pink-500/20 transition-all group"
          >
            <div className="relative aspect-square w-full overflow-hidden">
              <Image
                src={playlist.images?.[0]?.url || "/placeholder.svg?height=300&width=300"}
                alt={playlist.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  size="icon"
                  className="rounded-full bg-white text-black hover:bg-white/90 h-12 w-12"
                  onClick={() => window.open(playlist.external_urls.spotify, "_blank")}
                >
                  <Music2 className="h-6 w-6" />
                </Button>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg line-clamp-1">{playlist.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {playlist.description || `By ${playlist.owner.display_name}`}
              </p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Music2 className="mr-1 h-4 w-4" />
                  <span>{playlist.tracks.total} tracks</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/playlist/spotify/${playlist.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 hover:bg-gradient-to-r hover:from-pink-500 hover:to-violet-500 hover:text-white hover:border-transparent"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 hover:bg-gradient-to-r hover:from-pink-500 hover:to-violet-500 hover:text-white hover:border-transparent"
                    onClick={() => handleImportPlaylist(playlist)}
                  >
                    <Import className="h-3 w-3" />
                    Import
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
