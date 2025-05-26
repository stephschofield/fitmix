"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipForward, SkipBack, Music, RefreshCw } from "lucide-react"
import { getTrackAudioFeatures } from "@/lib/spotify-search"
import { cn } from "@/lib/utils"

interface AudioBeatAnalyzerProps {
  trackId: string
  trackName: string
  artistName: string
  previewUrl?: string | null
  className?: string
}

export function AudioBeatAnalyzer({ trackId, trackName, artistName, previewUrl, className }: AudioBeatAnalyzerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30) // Default for preview
  const [spotifyBpm, setSpotifyBpm] = useState<number | null>(null)
  const [measuredBpm, setMeasuredBpm] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [energyLevel, setEnergyLevel] = useState<number>(0)
  const [beatHistory, setBeatHistory] = useState<number[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const lastBeatTime = useRef<number>(0)
  const animationRef = useRef<number | null>(null)
  const beatDetectorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load audio features from Spotify
  useEffect(() => {
    const loadAudioFeatures = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const features = await getTrackAudioFeatures(trackId)

        if (features && features.tempo) {
          setSpotifyBpm(Math.round(features.tempo))
        } else {
          console.warn("Could not retrieve BPM information from Spotify")
        }
      } catch (err: any) {
        console.error("Error loading audio features:", err)
        // Don't set error - we'll measure BPM ourselves
      } finally {
        setIsLoading(false)
      }
    }

    loadAudioFeatures()
  }, [trackId])

  // Set up audio context and analyzer
  useEffect(() => {
    if (!previewUrl) return

    // Initialize audio context
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (err) {
        console.error("Web Audio API is not supported in this browser", err)
        setError("Your browser doesn't support audio analysis")
        return
      }
    }

    // Clean up function
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }

      if (beatDetectorTimeoutRef.current) {
        clearTimeout(beatDetectorTimeoutRef.current)
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [previewUrl])

  // Handle audio element events
  useEffect(() => {
    if (!audioRef.current || !previewUrl) return

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => {
      setIsPlaying(true)

      // Start audio analysis when playing
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume()
      }

      startAudioAnalysis()
    }

    const handlePause = () => {
      setIsPlaying(false)

      // Stop animation loop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)

      // Stop animation loop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
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
  }, [previewUrl])

  // Start audio analysis
  const startAudioAnalysis = () => {
    if (!audioRef.current || !audioContextRef.current || !previewUrl) return

    // Create analyzer if it doesn't exist
    if (!analyserRef.current) {
      const audioContext = audioContextRef.current
      const audioSource = audioContext.createMediaElementSource(audioRef.current)
      const analyser = audioContext.createAnalyser()

      // Connect the audio source to the analyzer and then to the destination
      audioSource.connect(analyser)
      analyser.connect(audioContext.destination)

      // Configure analyzer
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      analyserRef.current = analyser
      dataArrayRef.current = dataArray
    }

    // Start animation loop
    setIsAnalyzing(true)
    setBeatHistory([])
    animateAnalysis()
  }

  // Animation loop for real-time analysis
  const animateAnalysis = () => {
    if (!analyserRef.current || !dataArrayRef.current) return

    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current

    // Get frequency data
    analyser.getByteFrequencyData(dataArray)

    // Calculate energy in the low-mid frequency range (where beats usually are)
    // Focus on the first 10-15 frequency bins which contain the bass/kick frequencies
    let sum = 0
    const beatRange = 15
    for (let i = 0; i < beatRange; i++) {
      sum += dataArray[i]
    }
    const average = sum / beatRange
    const normalizedEnergy = average / 255 // Normalize to 0-1

    setEnergyLevel(normalizedEnergy)

    // Beat detection - look for energy spikes
    const energyThreshold = 0.7 // Adjust based on testing
    const now = performance.now()
    const timeSinceLastBeat = now - lastBeatTime.current

    // Only consider it a beat if:
    // 1. Energy is above threshold
    // 2. At least 250ms has passed since last beat (to avoid multiple detections of same beat)
    if (normalizedEnergy > energyThreshold && timeSinceLastBeat > 250) {
      lastBeatTime.current = now

      // Record beat times for BPM calculation
      if (isAnalyzing) {
        setBeatHistory((prev) => {
          const newHistory = [...prev, now]

          // Keep only the last 8 beats for calculation
          if (newHistory.length > 8) {
            return newHistory.slice(newHistory.length - 8)
          }
          return newHistory
        })
      }
    }

    // Calculate BPM from beat history
    if (beatHistory.length >= 4) {
      // Calculate time differences between beats
      const intervals = []
      for (let i = 1; i < beatHistory.length; i++) {
        intervals.push(beatHistory[i] - beatHistory[i - 1])
      }

      // Calculate average interval
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length

      // Convert to BPM: 60000ms (1 minute) / average interval in ms
      const calculatedBpm = Math.round(60000 / avgInterval)

      // Only update if the BPM is in a reasonable range (40-220)
      if (calculatedBpm >= 40 && calculatedBpm <= 220) {
        setMeasuredBpm(calculatedBpm)
      }
    }

    // Continue animation loop
    animationRef.current = requestAnimationFrame(animateAnalysis)
  }

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
    setCurrentTime(time)
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

  // Reset analysis
  const resetAnalysis = () => {
    setBeatHistory([])
    setMeasuredBpm(null)
    setIsAnalyzing(true)
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
            <span>Beat Analyzer</span>
          </div>
          <div className="flex items-center gap-2">
            {measuredBpm !== null && (
              <Badge variant="outline" className="text-lg font-bold px-3 py-1 bg-primary/10">
                {measuredBpm} BPM
              </Badge>
            )}
            {spotifyBpm !== null && measuredBpm === null && (
              <Badge variant="outline" className="text-lg font-bold px-3 py-1 bg-muted">
                {spotifyBpm} BPM (Spotify)
              </Badge>
            )}
          </div>
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
          {/* Energy level visualization */}
          <div
            className="absolute bottom-0 left-0 w-full bg-primary/30 transition-all duration-100"
            style={{ height: `${energyLevel * 100}%` }}
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
              <div className="animate-pulse">Loading...</div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : !previewUrl ? (
              <div className="text-muted-foreground">No preview available</div>
            ) : (
              <div className="text-4xl font-bold text-primary-foreground mix-blend-difference">
                {measuredBpm || spotifyBpm || "Play to detect"} BPM
              </div>
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
            <Button variant="outline" size="icon" onClick={resetAnalysis} disabled={!previewUrl || !isPlaying}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* BPM information */}
        {(measuredBpm !== null || spotifyBpm !== null) && (
          <div className="text-sm space-y-2 bg-muted/50 p-3 rounded-md">
            <p>
              <span className="font-medium">Measured BPM:</span> {measuredBpm || "Analyzing..."}
              {measuredBpm && spotifyBpm && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({Math.abs(measuredBpm - spotifyBpm)} {measuredBpm > spotifyBpm ? "faster" : "slower"} than Spotify's
                  value)
                </span>
              )}
            </p>
            <p>
              <span className="font-medium">Spotify BPM:</span> {spotifyBpm || "Not available"}
            </p>
            <p>
              <span className="font-medium">Beat every:</span>{" "}
              {measuredBpm ? (60 / measuredBpm).toFixed(2) : spotifyBpm ? (60 / spotifyBpm).toFixed(2) : "?"} seconds
            </p>
            <p className="text-xs text-muted-foreground">
              {(measuredBpm || spotifyBpm || 0) < 100
                ? "Slower tempo, suitable for warm-up, cool-down, or low-intensity workouts."
                : (measuredBpm || spotifyBpm || 0) < 120
                  ? "Moderate tempo, good for steady-state cardio or moderate intensity training."
                  : (measuredBpm || spotifyBpm || 0) < 140
                    ? "Energetic tempo, ideal for running, cycling, or medium-high intensity workouts."
                    : "High tempo, perfect for HIIT, sprints, or high-intensity workouts."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
