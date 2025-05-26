"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Plus, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { AudioTimeline } from "@/components/audio-timeline"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  initializePlayer,
  getPlayer,
  playTrack,
  seekToPosition,
  togglePlayback,
  getPlaybackState,
} from "@/lib/spotify-playback"

interface TimeMarker {
  id: string
  time: number
  label: string
  title?: string
}

interface FullTrackPlayerProps {
  trackId: string
  trackUri: string
  trackName: string
  artistName: string
  duration: number // in seconds
  timeMarkers: Array<{ time: string; title?: string }> // in format "MM:SS" with optional title
  onAddTimeMarker: (time: number, title?: string) => void
  className?: string
}

export function FullTrackPlayer({
  trackId,
  trackUri,
  trackName,
  artistName,
  duration,
  timeMarkers,
  onAddTimeMarker,
  className,
}: FullTrackPlayerProps) {
  const { toast } = useToast()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [markerTitle, setMarkerTitle] = useState("")
  const playbackStateInterval = useRef<NodeJS.Timeout | null>(null)

  // Parse time markers from string format to seconds
  const parseTimeToSeconds = (timeStr: string) => {
    const [mins, secs] = timeStr.split(":").map(Number)
    return mins * 60 + secs
  }

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Convert string time markers to TimeMarker objects
  const formattedTimeMarkers: TimeMarker[] = timeMarkers.map((marker, index) => ({
    id: `marker-${index}`,
    time: parseTimeToSeconds(marker.time),
    label: marker.time,
    title: marker.title,
  }))

  // Initialize the Spotify Web Playback SDK
  useEffect(() => {
    let mounted = true

    const initPlayer = async () => {
      try {
        setError(null)

        // Get the access token from localStorage
        const accessToken = localStorage.getItem("spotify_access_token")
        if (!accessToken) {
          setError("No Spotify access token found. Please log in again.")
          return
        }

        // Check if the user has Spotify Premium
        const response = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            setError("Your Spotify session has expired. Please log in again.")
          } else {
            setError("Failed to get user information from Spotify.")
          }
          return
        }

        const userData = await response.json()
        const hasPremium = userData.product === "premium"

        if (mounted) {
          setIsPremium(hasPremium)

          if (!hasPremium) {
            setError("Spotify Premium is required to play full tracks. You can still use the 30-second previews.")
            return
          }

          // Initialize the player
          const initialized = await initializePlayer(accessToken)

          if (initialized && mounted) {
            setIsLoaded(true)
            setError(null)

            // Start polling for playback state
            startPlaybackStatePolling()
          } else if (mounted) {
            setError("Failed to initialize Spotify player. Please make sure you have an active Spotify session.")
          }
        }
      } catch (err: any) {
        console.error("Error initializing player:", err)
        if (mounted) {
          setError(err.message || "Failed to initialize Spotify player")
        }
      }
    }

    initPlayer()

    return () => {
      mounted = false
      stopPlaybackStatePolling()
      // Don't disconnect the player here as it might be used by other components
    }
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPlaybackStatePolling()
    }
  }, [])

  // Start polling for playback state
  const startPlaybackStatePolling = () => {
    if (playbackStateInterval.current) {
      clearInterval(playbackStateInterval.current)
    }

    playbackStateInterval.current = setInterval(async () => {
      const state = await getPlaybackState()

      if (state) {
        setCurrentTime(state.position / 1000) // Convert ms to seconds
        setIsPlaying(!state.paused)
      }
    }, 1000)
  }

  // Stop polling for playback state
  const stopPlaybackStatePolling = () => {
    if (playbackStateInterval.current) {
      clearInterval(playbackStateInterval.current)
      playbackStateInterval.current = null
    }
  }

  // Handle play/pause
  const handlePlayPause = async () => {
    if (!isPremium) {
      toast({
        title: "Spotify Premium Required",
        description: "You need Spotify Premium to play full tracks.",
        variant: "destructive",
      })
      return
    }

    if (!isLoaded) {
      toast({
        title: "Player Not Ready",
        description: "The Spotify player is not ready yet.",
        variant: "destructive",
      })
      return
    }

    try {
      if (!isPlaying) {
        // If not currently playing, start playing the track
        const success = await playTrack(trackUri, currentTime * 1000)

        if (!success) {
          throw new Error("Failed to play track")
        }
      } else {
        // If already playing, toggle playback (pause)
        await togglePlayback()
      }
    } catch (err: any) {
      console.error("Playback error:", err)
      toast({
        title: "Playback Error",
        description: err.message || "Failed to control playback",
        variant: "destructive",
      })
    }
  }

  // Handle seeking
  const handleSeek = async (time: number) => {
    if (!isPremium || !isLoaded) return

    try {
      await seekToPosition(Math.floor(time * 1000)) // Convert to milliseconds
      setCurrentTime(time)
    } catch (err) {
      console.error("Seek error:", err)
    }
  }

  // Handle skip forward/backward
  const skipForward = async () => {
    if (!isPremium || !isLoaded) return

    const newTime = Math.min(currentTime + 10, duration)
    await handleSeek(newTime)
  }

  const skipBackward = async () => {
    if (!isPremium || !isLoaded) return

    const newTime = Math.max(currentTime - 10, 0)
    await handleSeek(newTime)
  }

  // Toggle mute
  const toggleMute = async () => {
    if (!isPremium || !isLoaded) return

    const player = getPlayer()
    if (!player) return

    try {
      if (isMuted) {
        await player.setVolume(0.5)
      } else {
        await player.setVolume(0)
      }
      setIsMuted(!isMuted)
    } catch (err) {
      console.error("Volume control error:", err)
    }
  }

  // Add current time marker
  const addCurrentTimeMarker = () => {
    onAddTimeMarker(currentTime, markerTitle || undefined)
    setMarkerTitle("")
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* Track info */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{trackName}</h3>
            <p className="text-sm text-muted-foreground">{artistName}</p>
          </div>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100">
                Premium
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100">
                Preview Only
              </Badge>
            )}

            {isLoaded ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100">
                Ready
              </Badge>
            ) : error ? (
              <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-100">
                Error
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100">
                Loading
              </Badge>
            )}
          </div>
        </div>

        {/* Timeline visualization */}
        <AudioTimeline
          duration={duration}
          currentTime={currentTime}
          timeMarkers={formattedTimeMarkers}
          onSeek={handleSeek}
          isPlaying={isPlaying}
        />

        {/* Playback controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={skipBackward} disabled={!isPremium || !isLoaded}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handlePlayPause}
              disabled={!isPremium || !isLoaded}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={skipForward} disabled={!isPremium || !isLoaded}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleMute} disabled={!isPremium || !isLoaded}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Marker title (optional)"
              value={markerTitle}
              onChange={(e) => setMarkerTitle(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md w-40"
            />
            <Button variant="outline" size="sm" className="gap-1" onClick={addCurrentTimeMarker} disabled={!isLoaded}>
              <Plus className="h-3 w-3" />
              Add at {formatTime(currentTime)}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

        {!isPremium && (
          <p className="text-sm text-amber-500 mt-2">
            Spotify Premium is required to play full tracks. You can still use the 30-second previews or add time
            markers manually.
          </p>
        )}
      </div>
    </Card>
  )
}
