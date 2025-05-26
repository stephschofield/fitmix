"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipForward, SkipBack, Music } from "lucide-react"
import { getTrackAudioFeatures } from "@/lib/spotify-search"
import { cn } from "@/lib/utils"

interface BPMAnalyzerProps {
  trackId: string
  trackName: string
  artistName: string
  previewUrl?: string | null
  className?: string
}

export function BPMAnalyzer({ trackId, trackName, artistName, previewUrl, className }: BPMAnalyzerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30) // Default for preview
  const [bpm, setBpm] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [beatPositions, setBeatPositions] = useState<number[]>([])
  const [nextBeatIndex, setNextBeatIndex] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastBeatTime = useRef<number>(0)

  // Load audio features from Spotify
  useEffect(() => {
    const loadAudioFeatures = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const features = await getTrackAudioFeatures(trackId)

        if (features && features.tempo) {
          setBpm(Math.round(features.tempo))

          // Calculate beat positions based on BPM
          // For a 30 second preview, calculate how many beats would occur
          const secondsPerBeat = 60 / features.tempo
          const totalBeats = Math.floor(30 / secondsPerBeat)

          const positions = []
          for (let i = 0; i < totalBeats; i++) {
            positions.push(i * secondsPerBeat)
          }

          setBeatPositions(positions)
        } else {
          setError("Could not retrieve BPM information")
        }
      } catch (err: any) {
        console.error("Error loading audio features:", err)
        setError(err.message || "Failed to load BPM information")
      } finally {
        setIsLoading(false)
      }
    }

    loadAudioFeatures()
  }, [trackId])

  // Handle audio element events
  useEffect(() => {
    if (!audioRef.current) return

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)

      // Check if we've reached the next beat
      if (beatPositions.length > 0 && nextBeatIndex < beatPositions.length) {
        if (audio.currentTime >= beatPositions[nextBeatIndex]) {
          // Trigger beat visualization
          lastBeatTime.current = performance.now()
          setNextBeatIndex(nextBeatIndex + 1)
        }
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      setNextBeatIndex(0) // Reset beat index when starting playback

      // Find the current beat index based on current time
      const currentBeatIndex = beatPositions.findIndex((pos) => pos > audio.currentTime)
      if (currentBeatIndex !== -1) {
        setNextBeatIndex(currentBeatIndex)
      }
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      setNextBeatIndex(0)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [beatPositions, nextBeatIndex])

  // Animation loop for beat visualization
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  // Handle play/pause
  const togglePlayback = () => {
    if (!audioRef.current || !previewUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Playback error:", err)
        setError("Failed to play audio")
      })
    }
  }

  // Handle seeking
  const handleSeek = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time

    // Update next beat index
    const newBeatIndex = beatPositions.findIndex((pos) => pos > time)
    if (newBeatIndex !== -1) {
      setNextBeatIndex(newBeatIndex)
    } else {
      setNextBeatIndex(beatPositions.length)
    }
  }

  // Skip forward/backward
  const skipForward = () => {
    if (!audioRef.current) return
    const newTime = Math.min(audioRef.current.currentTime + 5, duration)
    handleSeek(newTime)
  }

  const skipBackward = () => {
    if (!audioRef.current) return
    const newTime = Math.max(audioRef.current.currentTime - 5, 0)
    handleSeek(newTime)
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate beat visualization
  const timeSinceLastBeat = performance.now() - lastBeatTime.current
  const beatVisualization = Math.max(0, 1 - timeSinceLastBeat / 300) // Fade over 300ms

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span>BPM Analyzer</span>
          </div>
          {bpm !== null && (
            <Badge variant="outline" className="text-lg font-bold px-3 py-1 bg-primary/10">
              {bpm} BPM
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Track info */}
        <div>
          <h3 className="font-semibold">{trackName}</h3>
          <p className="text-sm text-muted-foreground">{artistName}</p>
        </div>

        {/* Audio element */}
        {previewUrl && <audio ref={audioRef} src={previewUrl} preload="auto" className="hidden" />}

        {/* Beat visualization */}
        <div className="relative h-20 bg-muted rounded-md overflow-hidden">
          {/* Beat markers */}
          {beatPositions.map((pos, index) => (
            <div
              key={index}
              className="absolute top-0 h-full w-0.5 bg-primary/30"
              style={{ left: `${(pos / duration) * 100}%` }}
            />
          ))}

          {/* Current position */}
          <div
            className="absolute top-0 h-full bg-primary/20"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />

          {/* Beat pulse */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                      w-16 h-16 rounded-full bg-primary transition-all duration-300"
            style={{
              opacity: beatVisualization * 0.7,
              transform: `translate(-50%, -50%) scale(${1 + beatVisualization})`,
            }}
          />

          {/* BPM display */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isLoading ? (
              <div className="animate-pulse">Loading BPM...</div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : !previewUrl ? (
              <div className="text-muted-foreground">No preview available</div>
            ) : (
              <div className="text-4xl font-bold text-primary-foreground mix-blend-difference">{bpm} BPM</div>
            )}
          </div>
        </div>

        {/* Playback controls */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={(values) => handleSeek(values[0])}
            disabled={!previewUrl}
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={skipBackward} disabled={!previewUrl}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlayback}
              disabled={!previewUrl}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={skipForward} disabled={!previewUrl}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* BPM information */}
        {bpm !== null && (
          <div className="text-sm space-y-2 bg-muted/50 p-3 rounded-md">
            <p>
              <span className="font-medium">Tempo:</span> {bpm} beats per minute
            </p>
            <p>
              <span className="font-medium">Beat every:</span> {(60 / bpm).toFixed(2)} seconds
            </p>
            <p className="text-xs text-muted-foreground">
              {bpm < 100
                ? "Slower tempo, suitable for warm-up, cool-down, or low-intensity workouts."
                : bpm < 120
                  ? "Moderate tempo, good for steady-state cardio or moderate intensity training."
                  : bpm < 140
                    ? "Energetic tempo, ideal for running, cycling, or medium-high intensity workouts."
                    : "High tempo, perfect for HIIT, sprints, or high-intensity workouts."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
