"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Clock, Edit, Music, Play, Save, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Mock data - would come from API in real app
const playlistData = {
  id: "1",
  title: "HIIT Workout Mix",
  description: "High energy tracks for interval training",
  coverUrl: "/placeholder.svg?height=400&width=400",
  tracks: [
    { id: "t1", title: "High Energy", artist: "DJ Trainer", duration: "3:45", timeMarkers: ["0:45", "1:30", "2:15"] },
    { id: "t2", title: "Power Up", artist: "Fitness Beats", duration: "4:20", timeMarkers: ["1:10", "2:30"] },
    { id: "t3", title: "Intense Cardio", artist: "Workout Kings", duration: "3:15", timeMarkers: ["0:50"] },
    { id: "t4", title: "Sprint", artist: "Run Track", duration: "2:55", timeMarkers: ["0:30", "1:45", "2:30"] },
    { id: "t5", title: "Cool Down", artist: "Relaxation", duration: "5:10", timeMarkers: [] },
  ],
}

export default function PlaylistDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const [playlist, setPlaylist] = useState(playlistData)
  const [editingTrack, setEditingTrack] = useState<string | null>(null)
  const [newMarker, setNewMarker] = useState("")

  const handleAddTimeMarker = (trackId: string) => {
    if (!newMarker) return

    setPlaylist((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.id === trackId ? { ...track, timeMarkers: [...track.timeMarkers, newMarker] } : track,
      ),
    }))

    setNewMarker("")
    toast({
      title: "Time marker added",
      description: `Added marker at ${newMarker}`,
    })
  }

  const handleRemoveTimeMarker = (trackId: string, markerIndex: number) => {
    setPlaylist((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              timeMarkers: track.timeMarkers.filter((_, i) => i !== markerIndex),
            }
          : track,
      ),
    }))

    toast({
      description: "Time marker removed",
    })
  }

  const handleSavePlaylist = () => {
    // In a real app, this would save to the API
    toast({
      title: "Playlist saved",
      description: "Your changes have been saved",
    })
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
            <Button variant="outline" className="gap-2" onClick={handleSavePlaylist}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg">
              <Image src={playlist.coverUrl || "/placeholder.svg"} alt={playlist.title} fill className="object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{playlist.title}</h1>
              <p className="text-muted-foreground">{playlist.description}</p>
              <div className="flex items-center gap-2 mt-4">
                <Music className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{playlist.tracks.length} tracks</span>
              </div>
              <div className="mt-4">
                <Button className="w-full gap-2">
                  <Play className="h-4 w-4" />
                  Play on Spotify
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tracks & Time Markers</h2>
              <Button variant="outline" size="sm" className="gap-2">
                <Music className="h-4 w-4" />
                Add Track
              </Button>
            </div>

            <div className="space-y-4">
              {playlist.tracks.map((track) => (
                <Card key={track.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{track.title}</h3>
                      <p className="text-sm text-muted-foreground">{track.artist}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        <span>{track.duration}</span>
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
                      <div>
                        <Label>Time Markers</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {track.timeMarkers.map((marker, index) => (
                            <div key={index} className="flex items-center bg-primary/10 text-sm px-2 py-1 rounded">
                              <span>{marker}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 ml-1"
                                onClick={() => handleRemoveTimeMarker(track.id, index)}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {track.timeMarkers.length === 0 && (
                            <span className="text-sm text-muted-foreground">No time markers yet</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Add time marker (e.g. 1:30)"
                          value={newMarker}
                          onChange={(e) => setNewMarker(e.target.value)}
                          className="max-w-[200px]"
                        />
                        <Button variant="outline" size="sm" onClick={() => handleAddTimeMarker(track.id)}>
                          Add
                        </Button>
                      </div>

                      <div className="pt-2">
                        <Label className="mb-2 block">Track Position</Label>
                        <Slider defaultValue={[0]} max={100} step={1} />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0:00</span>
                          <span>{track.duration}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
