"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Clock, Edit, Music, ExternalLink, RefreshCw, Trash, Save, Tag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchPlaylistDetails } from "@/lib/spotify-client"
import { saveTimeMarkers, getTimeMarkers } from "@/lib/time-markers"
import { TrackPlayer } from "@/components/track-player"
import { FullTrackPlayerDebug } from "@/components/full-track-player-debug"
import { Switch } from "@/components/ui/switch"

// Helper to format time from seconds to MM:SS
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// Helper to parse time string to seconds
const parseTimeToSeconds = (timeStr: string) => {
  const [mins, secs] = timeStr.split(":").map(Number)
  return mins * 60 + secs
}

export default function SpotifyPlaylistPage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTrack, setEditingTrack] = useState<string | null>(null)
  const [newMarker, setNewMarker] = useState("")
  const [newMarkerTitle, setNewMarkerTitle] = useState("")
  const [timeMarkers, setTimeMarkers] = useState<Record<string, Array<{ time: string; title?: string }>>>({})
  const [useFullTracks, setUseFullTracks] = useState(false)
  const [editingMarker, setEditingMarker] = useState<{ trackId: string; index: number } | null>(null)
  const [editMarkerTitle, setEditMarkerTitle] = useState("")

  // Load playlist details
  useEffect(() => {
    async function loadPlaylist() {
      try {
        setLoading(true)
        setError(null)

        // Fetch playlist details from Spotify
        const playlistData = await fetchPlaylistDetails(params.id)
        setPlaylist(playlistData)

        // Fetch saved time markers for this playlist
        try {
          const savedMarkers = await getTimeMarkers(params.id)

          // Convert old format to new format if needed
          const formattedMarkers: Record<string, Array<{ time: string; title?: string }>> = {}

          Object.entries(savedMarkers || {}).forEach(([trackId, markers]) => {
            if (Array.isArray(markers)) {
              if (typeof markers[0] === "string") {
                // Old format: string[]
                formattedMarkers[trackId] = (markers as string[]).map((time) => ({ time }))
              } else {
                // Already in new format
                formattedMarkers[trackId] = markers as any
              }
            }
          })

          setTimeMarkers(formattedMarkers)
        } catch (markerError) {
          console.error("Error loading time markers:", markerError)
          // If there's an error with the markers, just start with empty markers
          setTimeMarkers({})
        }
      } catch (err: any) {
        console.error("Error loading playlist:", err)
        setError(err.message || "Failed to load playlist")
        toast({
          title: "Error",
          description: err.message || "Failed to load playlist",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadPlaylist()
  }, [params.id, toast])

  const handleAddTimeMarker = (trackId: string) => {
    if (!newMarker) return

    // Validate time format (MM:SS)
    if (!/^\d+:\d{2}$/.test(newMarker)) {
      toast({
        title: "Invalid time format",
        description: "Please use the format MM:SS (e.g. 1:30)",
        variant: "destructive",
      })
      return
    }

    // Add the marker
    setTimeMarkers((prev) => {
      const trackMarkers = prev[trackId] || []
      const newMarkerObj = {
        time: newMarker,
        title: newMarkerTitle || undefined,
      }

      const updatedMarkers = [...trackMarkers, newMarkerObj].sort((a, b) => {
        return parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time)
      })

      return {
        ...prev,
        [trackId]: updatedMarkers,
      }
    })

    setNewMarker("")
    setNewMarkerTitle("")

    toast({
      title: "Time marker added",
      description: `Added marker at ${newMarker}${newMarkerTitle ? ` with title "${newMarkerTitle}"` : ""}`,
    })
  }

  const handleAddCurrentTimeMarker = (trackId: string, currentTime: number, title?: string) => {
    const timeStr = formatTime(currentTime)
    setTimeMarkers((prev) => {
      const trackMarkers = prev[trackId] || []
      const newMarkerObj = {
        time: timeStr,
        title: title,
      }

      const updatedMarkers = [...trackMarkers, newMarkerObj].sort((a, b) => {
        return parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time)
      })

      return {
        ...prev,
        [trackId]: updatedMarkers,
      }
    })

    toast({
      title: "Time marker added",
      description: `Added marker at ${timeStr}${title ? ` with title "${title}"` : ""}`,
    })
  }

  const handleRemoveTimeMarker = (trackId: string, markerIndex: number) => {
    setTimeMarkers((prev) => {
      const trackMarkers = prev[trackId] || []
      const updatedMarkers = trackMarkers.filter((_, i) => i !== markerIndex)

      const newMarkers = { ...prev }
      if (updatedMarkers.length === 0) {
        delete newMarkers[trackId]
      } else {
        newMarkers[trackId] = updatedMarkers
      }

      return newMarkers
    })

    toast({
      description: "Time marker removed",
    })
  }

  const handleEditMarkerTitle = () => {
    if (!editingMarker) return

    const { trackId, index } = editingMarker

    setTimeMarkers((prev) => {
      const trackMarkers = [...(prev[trackId] || [])]
      if (trackMarkers[index]) {
        trackMarkers[index] = {
          ...trackMarkers[index],
          title: editMarkerTitle || undefined,
        }
      }

      return {
        ...prev,
        [trackId]: trackMarkers,
      }
    })

    setEditingMarker(null)
    setEditMarkerTitle("")

    toast({
      description: "Marker title updated",
    })
  }

  const handleSaveTimeMarkers = async () => {
    try {
      await saveTimeMarkers(params.id, timeMarkers)

      toast({
        title: "Time markers saved",
        description: "Your changes have been saved",
      })
    } catch (err: any) {
      console.error("Error saving time markers:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to save time markers",
        variant: "destructive",
      })
    }
  }

  if (loading) {
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
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
        </header>
        <main className="flex-1 container py-6">
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
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
              <div className="font-bold text-xl">Playlist Editor</div>
            </div>
          </div>
        </header>
        <main className="flex-1 container py-6 flex items-center justify-center">
          <Card className="p-6 max-w-md mx-auto text-center">
            <div className="flex flex-col items-center gap-4">
              <Music className="h-12 w-12 text-pink-500 opacity-50" />
              <h3 className="text-xl font-semibold">Failed to load playlist</h3>
              <p className="text-muted-foreground">{error}</p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                  Back to Dashboard
                </Button>
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    )
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
            <div className="font-bold text-xl">Playlist Editor</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Preview Mode</span>
              <Switch checked={useFullTracks} onCheckedChange={setUseFullTracks} aria-label="Toggle full track mode" />
              <span className="text-sm">Full Track Mode</span>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleSaveTimeMarkers}>
              <Save className="h-4 w-4" />
              Save Time Markers
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg">
              <Image
                src={playlist.images?.[0]?.url || "/placeholder.svg?height=300&width=300"}
                alt={playlist.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{playlist.name}</h1>
              <p className="text-muted-foreground">{playlist.description || `By ${playlist.owner.display_name}`}</p>
              <div className="flex items-center gap-2 mt-4">
                <Music className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{playlist.tracks.total} tracks</span>
              </div>
              <div className="mt-4 space-y-2">
                <Button className="w-full gap-2" onClick={() => window.open(playlist.external_urls.spotify, "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                  Open in Spotify
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tracks & Time Markers</h2>
              <p className="text-sm text-muted-foreground">Add time markers to songs for workout transitions</p>
            </div>

            <div className="space-y-4">
              {playlist.tracks.items.map((item: any) => {
                const track = item.track
                const trackMarkers = timeMarkers[track.id] || []
                const durationInSeconds = Math.round(track.duration_ms / 1000)

                return (
                  <Card key={track.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{track.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {track.artists.map((a: any) => a.name).join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="mr-1 h-4 w-4" />
                          <span>{formatTime(durationInSeconds)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTrack(editingTrack === track.id ? null : track.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {editingTrack === track.id && (
                      <div className="mt-4 space-y-4">
                        {useFullTracks ? (
                          <FullTrackPlayerDebug
                            trackId={track.id}
                            trackUri={track.uri}
                            trackName={track.name}
                            artistName={track.artists.map((a: any) => a.name).join(", ")}
                            duration={durationInSeconds}
                            timeMarkers={trackMarkers}
                            onAddTimeMarker={(time, title) => handleAddCurrentTimeMarker(track.id, time, title)}
                          />
                        ) : track.preview_url ? (
                          <TrackPlayer
                            trackId={track.id}
                            trackName={track.name}
                            artistName={track.artists.map((a: any) => a.name).join(", ")}
                            previewUrl={track.preview_url}
                            duration={30} // Spotify previews are 30 seconds
                            timeMarkers={trackMarkers}
                            onAddTimeMarker={(time, title) => handleAddCurrentTimeMarker(track.id, time, title)}
                          />
                        ) : (
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-md">
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              No preview available for this track. Enable Full Track Mode to play the complete song
                              (requires Spotify Premium).
                            </p>
                          </div>
                        )}

                        <div>
                          <Label>Time Markers</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {trackMarkers.map((marker, index) => (
                              <Badge key={index} variant="outline" className="flex items-center gap-1">
                                <span>{marker.time}</span>
                                {marker.title && (
                                  <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                    {marker.title}
                                  </span>
                                )}
                                <div className="flex ml-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 hover:bg-blue-100 hover:text-blue-700 rounded-full"
                                    onClick={() => {
                                      setEditingMarker({ trackId: track.id, index })
                                      setEditMarkerTitle(marker.title || "")
                                    }}
                                  >
                                    <Tag className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                                    onClick={() => handleRemoveTimeMarker(track.id, index)}
                                  >
                                    <Trash className="h-3 w-3" />
                                  </Button>
                                </div>
                              </Badge>
                            ))}
                            {trackMarkers.length === 0 && (
                              <span className="text-sm text-muted-foreground">No time markers yet</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1 flex gap-2">
                            <Input
                              placeholder="Time (e.g. 1:30)"
                              value={newMarker}
                              onChange={(e) => setNewMarker(e.target.value)}
                              className="max-w-[120px]"
                            />
                            <Input
                              placeholder="Title (optional)"
                              value={newMarkerTitle}
                              onChange={(e) => setNewMarkerTitle(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleAddTimeMarker(track.id)}>
                            Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Marker Title Dialog */}
      {editingMarker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Edit Marker Title</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Add a descriptive title to your time marker to help identify what happens at this point in the track.
            </p>

            <div className="py-4">
              <Label htmlFor="markerTitle">Marker Title</Label>
              <Input
                id="markerTitle"
                value={editMarkerTitle}
                onChange={(e) => setEditMarkerTitle(e.target.value)}
                placeholder="e.g. Chorus, Sprint, Cool down"
                className="mt-2"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditingMarker(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditMarkerTitle}>Save Title</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
