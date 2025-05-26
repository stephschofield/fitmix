"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ChevronLeft, Loader2, Wand2, AlertCircle, ExternalLink, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth-provider"
import { searchSpotifyTracks, getTrackAudioFeatures, createSpotifyPlaylist } from "@/lib/spotify-search"
import Image from "next/image"

// Helper function to format milliseconds to MM:SS
const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export default function AIGeneratorPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    workoutType: "",
    duration: 30,
    bpm: 120,
    intensity: 7,
    vibe: "",
  })

  const [generatedPlaylist, setGeneratedPlaylist] = useState<any>(null)

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleGeneratePlaylist = async () => {
    try {
      setIsGenerating(true)
      setError(null)

      // Validate form
      if (!form.name || !form.workoutType) {
        setError("Please provide a playlist name and workout type")
        return
      }

      // Calculate BPM range based on intensity
      const bpmVariance = 10 + form.intensity * 2
      const minBpm = Math.max(form.bpm - bpmVariance, 60)
      const maxBpm = form.bpm + bpmVariance

      // Calculate number of tracks based on duration (assuming ~3.5 mins per track)
      const tracksNeeded = Math.ceil(form.duration / 3.5)

      // Build search queries based on workout type and vibe
      const searchTerms: string[] = []

      // Add workout type specific terms
      switch (form.workoutType) {
        case "hiit":
          searchTerms.push("workout", "cardio", "hiit", "intense", "energy")
          break
        case "cycling":
          searchTerms.push("cycling", "spin", "ride", "pedal", "cadence")
          break
        case "running":
          searchTerms.push("running", "run", "jog", "sprint", "marathon")
          break
        case "strength":
          searchTerms.push("strength", "power", "gym", "lift", "strong")
          break
        case "yoga":
          searchTerms.push("yoga", "calm", "flow", "meditation", "zen")
          break
        case "dance":
          searchTerms.push("dance", "choreography", "rhythm", "beat", "groove")
          break
        default:
          searchTerms.push("workout", "fitness", "exercise")
      }

      // Add vibe terms if provided
      if (form.vibe) {
        searchTerms.push(...form.vibe.split(" "))
      }

      // Randomize and select a few terms for variety
      const shuffledTerms = searchTerms.sort(() => 0.5 - Math.random())
      const selectedTerms = shuffledTerms.slice(0, 3).join(" ")

      // Search for tracks
      const tracks = await searchSpotifyTracks(selectedTerms, tracksNeeded * 3, minBpm, maxBpm)

      if (tracks.length === 0) {
        setError("No tracks found matching your criteria. Try adjusting your preferences.")
        setIsGenerating(false)
        return
      }

      // Get audio features for all tracks to sort by BPM
      const tracksWithFeatures = await Promise.all(
        tracks.slice(0, tracksNeeded * 2).map(async (track: any) => {
          try {
            const features = await getTrackAudioFeatures(track.id)
            return {
              ...track,
              features,
            }
          } catch (error) {
            console.error(`Error getting features for track ${track.id}:`, error)
            // Return the track with default features
            return {
              ...track,
              features: {
                tempo: 120, // Default BPM
                energy: 0.7,
                danceability: 0.7,
                valence: 0.5,
              },
            }
          }
        }),
      )

      // No need to filter out tracks with no features since we're providing defaults
      const validTracks = tracksWithFeatures

      // Sort tracks by BPM to create a progression
      const sortedTracks = validTracks.sort((a, b) => {
        // For warm-up, we want lower BPM tracks first
        return a.features.tempo - b.features.tempo
      })

      // Select final tracks for the playlist
      const finalTracks = sortedTracks.slice(0, tracksNeeded)

      // Calculate total duration and average BPM
      const totalDurationMs = finalTracks.reduce((sum, track) => sum + track.duration_ms, 0)
      const totalDurationMinutes = Math.round(totalDurationMs / 60000)
      const averageBpm = Math.round(
        finalTracks.reduce((sum, track) => sum + track.features.tempo, 0) / finalTracks.length,
      )

      // Create the generated playlist object
      const playlist = {
        name: form.name,
        description: form.description || `${form.workoutType} workout with ${form.vibe} vibes`,
        duration: totalDurationMinutes,
        averageBpm,
        tracks: finalTracks.map((track: any) => ({
          id: track.id,
          uri: track.uri,
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(", "),
          album: track.album.name,
          duration: formatDuration(track.duration_ms),
          bpm: Math.round(track.features.tempo),
          image: track.album.images[0]?.url || "/placeholder.svg?height=64&width=64",
        })),
      }

      setGeneratedPlaylist(playlist)
      setGenerated(true)

      toast({
        title: "Playlist generated!",
        description: "Your AI playlist is ready to customize",
      })
    } catch (err: any) {
      console.error("Error generating playlist:", err)
      setError(err.message || "There was an error generating your playlist")
      toast({
        title: "Generation failed",
        description: err.message || "There was an error generating your playlist",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSavePlaylist = async () => {
    if (!user || !generatedPlaylist) return

    try {
      setIsSaving(true)

      // Get track URIs
      const trackUris = generatedPlaylist.tracks.map((track: any) => track.uri)

      // Create the playlist on Spotify
      const playlist = await createSpotifyPlaylist(
        user.id,
        generatedPlaylist.name,
        generatedPlaylist.description,
        trackUris,
      )

      toast({
        title: "Playlist saved to Spotify",
        description: "Your AI playlist has been saved to your Spotify account",
      })

      // Open the playlist in Spotify
      window.open(playlist.external_urls.spotify, "_blank")
    } catch (err: any) {
      console.error("Error saving playlist:", err)
      toast({
        title: "Save failed",
        description: err.message || "There was an error saving your playlist to Spotify",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
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
            <div className="font-bold text-xl">AI Playlist Generator</div>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        {!generated ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Create an AI Playlist
              </CardTitle>
              <CardDescription>
                Describe your workout and we'll generate the perfect playlist using real Spotify tracks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Playlist Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. HIIT Cardio Mix"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Short description of your workout"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workoutType">Workout Type</Label>
                <Select onValueChange={(value) => handleChange("workoutType", value)} defaultValue={form.workoutType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workout type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="cycling">Cycling/Spin</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="strength">Strength Training</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="dance">Dance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <div className="flex gap-4 items-center">
                  <Slider
                    id="duration"
                    min={10}
                    max={120}
                    step={5}
                    value={[form.duration]}
                    onValueChange={(values) => handleChange("duration", values[0])}
                    className="flex-1"
                  />
                  <span className="w-12 text-right">{form.duration}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bpm">Target BPM</Label>
                <div className="flex gap-4 items-center">
                  <Slider
                    id="bpm"
                    min={60}
                    max={200}
                    step={5}
                    value={[form.bpm]}
                    onValueChange={(values) => handleChange("bpm", values[0])}
                    className="flex-1"
                  />
                  <span className="w-12 text-right">{form.bpm}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intensity">Intensity (1-10)</Label>
                <div className="flex gap-4 items-center">
                  <Slider
                    id="intensity"
                    min={1}
                    max={10}
                    step={1}
                    value={[form.intensity]}
                    onValueChange={(values) => handleChange("intensity", values[0])}
                    className="flex-1"
                  />
                  <span className="w-12 text-right">{form.intensity}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vibe">Vibe/Mood</Label>
                <Input
                  id="vibe"
                  placeholder="e.g. Energetic, Motivational, Chill"
                  value={form.vibe}
                  onChange={(e) => handleChange("vibe", e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full gap-2" onClick={handleGeneratePlaylist} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate Playlist
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Generated Playlist: {generatedPlaylist.name}</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setGenerated(false)}>
                  Regenerate
                </Button>
                <Button onClick={handleSavePlaylist} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save to Spotify
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Playlist Details</CardTitle>
                <CardDescription>{generatedPlaylist.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{generatedPlaylist.duration} minutes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Average BPM:</span>
                    <span className="font-medium">{generatedPlaylist.averageBpm} BPM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tracks:</span>
                    <span className="font-medium">{generatedPlaylist.tracks.length} songs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Track List</h2>
              <div className="space-y-3">
                {generatedPlaylist.tracks.map((track: any, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={track.image || "/placeholder.svg"}
                          alt={track.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{track.title}</h3>
                        <p className="text-sm text-muted-foreground">{track.artist}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{track.duration}</div>
                        <div className="text-xs text-muted-foreground">{track.bpm} BPM</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2"
                        onClick={() => window.open(`https://open.spotify.com/track/${track.id}`, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
