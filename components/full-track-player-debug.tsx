"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Plus, SkipBack, SkipForward, Volume2, VolumeX, AlertCircle } from "lucide-react"
import { AudioTimeline } from "@/components/audio-timeline"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  loadSpotifyPlaybackSDK,
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

export function FullTrackPlayerDebug({
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
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [sdkLoaded, setSdkLoaded] = useState(false)
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
        setDebugInfo((prev) => ({ ...prev, initStarted: true }))

        // Get the access token from localStorage
        const accessToken = localStorage.getItem("spotify_access_token")
        if (!accessToken) {
          setError("No Spotify access token found. Please log in again.")
          setDebugInfo((prev) => ({ ...prev, accessToken: false }))
          return
        }

        setDebugInfo((prev) => ({ ...prev, accessToken: true }))

        // Check if the user has Spotify Premium
        try {
          const response = await fetch("https://api.spotify.com/v1/me", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })

          setDebugInfo((prev) => ({
            ...prev,
            userApiStatus: response.status,
            userApiOk: response.ok,
          }))

          if (!response.ok) {
            if (response.status === 401) {
              setError("Your Spotify session has expired. Please log in again.")
            } else {
              setError(`Failed to get user information from Spotify. Status: ${response.status}`)
            }
            return
          }

          const userData = await response.json()
          const hasPremium = userData.product === "premium"

          setDebugInfo((prev) => ({
            ...prev,
            userProduct: userData.product,
            hasPremium,
          }))

          if (mounted) {
            setIsPremium(hasPremium)

            if (!hasPremium) {
              setError("Spotify Premium is required to play full tracks. You can still use the 30-second previews.")
              return
            }

            // Load the SDK
            try {
              await loadSpotifyPlaybackSDK()
              setSdkLoaded(true)
              setDebugInfo((prev) => ({ ...prev, sdkLoaded: true }))
            } catch (sdkError: any) {
              setError(`Failed to load Spotify SDK: ${sdkError.message}`)
              setDebugInfo((prev) => ({ ...prev, sdkError: sdkError.message }))
              return
            }

            // Initialize the player
            try {
              const initialized = await initializePlayer(accessToken)
              setDebugInfo((prev) => ({ ...prev, playerInitialized: initialized }))

              if (initialized && mounted) {
                setIsLoaded(true)
                setError(null)

                // Start polling for playback state
                startPlaybackStatePolling()
              } else if (mounted) {
                setError("Failed to initialize Spotify player. Please make sure you have an active Spotify session.")
              }
            } catch (playerError: any) {
              setError(`Player initialization error: ${playerError.message}`)
              setDebugInfo((prev) => ({ ...prev, playerError: playerError.message }))
            }
          }
        } catch (userError: any) {
          setError(`Error fetching user data: ${userError.message}`)
          setDebugInfo((prev) => ({ ...prev, userError: userError.message }))
        }
      } catch (err: any) {
        console.error("Error initializing player:", err)
        if (mounted) {
          setError(err.message || "Failed to initialize Spotify player")
          setDebugInfo((prev) => ({ ...prev, generalError: err.message }))
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
      try {
        const state = await getPlaybackState()

        setDebugInfo((prev) => ({
          ...prev,
          playbackState: state ? "received" : "null",
          playbackPosition: state?.position,
          playbackPaused: state?.paused,
        }))

        if (state) {
          setCurrentTime(state.position / 1000) // Convert ms to seconds
          setIsPlaying(!state.paused)
        }
      } catch (err: any) {
        setDebugInfo((prev) => ({ ...prev, playbackStateError: err.message }))
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
      setDebugInfo((prev) => ({ ...prev, playAttempt: true, isPlaying: !isPlaying }))

      if (!isPlaying) {
        // If not currently playing, start playing the track
        const success = await playTrack(trackUri, currentTime * 1000)

        setDebugInfo((prev) => ({ ...prev, playSuccess: success }))

        if (!success) {
          throw new Error("Failed to play track")
        }
      } else {
        // If already playing, toggle playback (pause)
        await togglePlayback()
      }
    } catch (err: any) {
      console.error("Playback error:", err)
      setDebugInfo((prev) => ({ ...prev, playError: err.message }))
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
    } catch (err: any) {
      setDebugInfo((prev) => ({ ...prev, seekError: err.message }))
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
    } catch (err: any) {
      setDebugInfo((prev) => ({ ...prev, volumeError: err.message }))
    }
  }

  // Add current time marker
  const addCurrentTimeMarker = () => {
    onAddTimeMarker(currentTime, markerTitle || undefined)
    setMarkerTitle("")
  }

  // Force reload SDK
  const handleReloadSDK = async () => {
    try {
      setSdkLoaded(false)
      setIsLoaded(false)

      // Get the access token
      const accessToken = localStorage.getItem("spotify_access_token")
      if (!accessToken) {
        setError("No access token available")
        return
      }

      // Load SDK
      await loadSpotifyPlaybackSDK()
      setSdkLoaded(true)

      // Initialize player
      const initialized = await initializePlayer(accessToken)
      if (initialized) {
        setIsLoaded(true)
        setError(null)
        startPlaybackStatePolling()

        toast({
          title: "Player Reloaded",
          description: "Spotify player has been reinitialized",
        })
      } else {
        setError("Failed to initialize player after reload")
      }
    } catch (err: any) {
      setError(`Reload failed: ${err.message}`)
    }
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
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {!isPremium && (
          <p className="text-sm text-amber-500 mt-2">
            Spotify Premium is required to play full tracks. You can still use the 30-second previews or add time
            markers manually.
          </p>
        )}

        {/* Debug information */}
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md p-3">
          <h4 className="font-medium text-sm mb-2">Debug Information</h4>
          <div className="text-xs space-y-1 font-mono">
            <p>Track URI: {trackUri}</p>
            <p>Access Token: {debugInfo.accessToken ? "✅ Present" : "❌ Missing"}</p>
            <p>SDK Loaded: {sdkLoaded ? "✅ Yes" : "❌ No"}</p>
            <p>Premium Account: {isPremium ? "✅ Yes" : "❌ No"}</p>
            <p>Player Initialized: {debugInfo.playerInitialized ? "✅ Yes" : "❌ No"}</p>
            <p>Player Ready: {isLoaded ? "✅ Yes" : "❌ No"}</p>
            <p>Playback State: {debugInfo.playbackState || "N/A"}</p>
            <p>Current Position: {debugInfo.playbackPosition || "N/A"}</p>
            <p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
            <p>User Product: {debugInfo.userProduct || "Unknown"}</p>
            {debugInfo.generalError && <p className="text-red-500">Error: {debugInfo.generalError}</p>}
            {debugInfo.sdkError && <p className="text-red-500">SDK Error: {debugInfo.sdkError}</p>}
            {debugInfo.playerError && <p className="text-red-500">Player Error: {debugInfo.playerError}</p>}
            {debugInfo.playError && <p className="text-red-500">Play Error: {debugInfo.playError}</p>}
          </div>
        </div>

        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleReloadSDK}>
            Reload Player
          </Button>
        </div>
      </div>
    </Card>
  )
}
