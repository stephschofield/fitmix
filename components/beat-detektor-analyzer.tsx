"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipForward, SkipBack, Music, RefreshCw } from "lucide-react"
import { getTrackAudioFeatures } from "@/lib/spotify-search"
import { cn } from "@/lib/utils"
import { BeatDetektor, BeatDetektorRenderingContext } from "@/lib/beat-detektor"

interface BeatDetektorAnalyzerProps {
  trackId: string
  trackName: string
  artistName: string
  previewUrl?: string | null
  className?: string
  adminMode?: boolean
}

export function BeatDetektorAnalyzer({
  trackId,
  trackName,
  artistName,
  previewUrl,
  className,
  adminMode = false,
}: BeatDetektorAnalyzerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30) // Default for preview
  const [spotifyBpm, setSpotifyBpm] = useState<number | null>(null)
  const [measuredBpm, setMeasuredBpm] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [beatPositions, setBeatPositions] = useState<number[]>([])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const beatDetektorRef = useRef<BeatDetektor | null>(null)
  const renderContextRef = useRef<BeatDetektorRenderingContext | null>(null)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

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

  // Initialize BeatDetektor and canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Create BeatDetektor instance
    beatDetektorRef.current = new BeatDetektor(60, 200)

    // Create rendering context
    renderContextRef.current = new BeatDetektorRenderingContext(ctx, canvas.width, canvas.height)

    // Clean up
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

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

      startTimeRef.current = performance.now() / 1000 - audio.currentTime

      // Reset BeatDetektor
      if (beatDetektorRef.current) {
        beatDetektorRef.current.reset()
      }

      setBeatPositions([])
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
    if (!audioRef.current || !audioContextRef.current || !previewUrl || !canvasRef.current || !beatDetektorRef.current)
      return

    // Create analyzer if it doesn't exist
    if (!analyserRef.current) {
      const audioContext = audioContextRef.current
      const audioSource = audioContext.createMediaElementSource(audioRef.current)
      const analyser = audioContext.createAnalyser()

      // Connect the audio source to the analyzer and then to the destination
      audioSource.connect(analyser)
      analyser.connect(audioContext.destination)

      // Configure analyzer
      analyser.fftSize = 512
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      analyserRef.current = analyser
      dataArrayRef.current = dataArray
    }

    // Start animation loop
    animateAnalysis()
  }

  // Animation loop for real-time analysis
  const animateAnalysis = () => {
    if (
      !analyserRef.current ||
      !dataArrayRef.current ||
      !canvasRef.current ||
      !beatDetektorRef.current ||
      !renderContextRef.current
    ) {
      animationRef.current = requestAnimationFrame(animateAnalysis)
      return
    }

    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const beatDetektor = beatDetektorRef.current
    const renderContext = renderContextRef.current

    if (!ctx) {
      animationRef.current = requestAnimationFrame(animateAnalysis)
      return
    }

    // Get frequency data
    analyser.getByteFrequencyData(dataArray)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Normalize data for BeatDetektor (0.0-1.0)
    const normalizedData = Array.from(dataArray).map((value) => value / 255.0)

    // Process audio data with BeatDetektor
    const timer_seconds = performance.now() / 1000
    const bpm = beatDetektor.process(timer_seconds, normalizedData)

    // Update measured BPM
    if (beatDetektor.winning_bpm_valid()) {
      setMeasuredBpm(Math.round(beatDetektor.winning_bpm))

      // Calculate beat positions
      const secondsPerBeat = 60.0 / beatDetektor.winning_bpm
      const currentAudioTime = audioRef.current?.currentTime || 0
      const audioStartTime = startTimeRef.current

      // Calculate the first beat that would occur after the current time
      const firstBeatAfterStart = Math.ceil(currentAudioTime / secondsPerBeat) * secondsPerBeat

      // Generate beat positions
      const newBeatPositions = []
      for (let i = 0; i < 20; i++) {
        const beatTime = firstBeatAfterStart + i * secondsPerBeat
        if (beatTime < duration) {
          newBeatPositions.push(beatTime)
        }
      }

      setBeatPositions(newBeatPositions)
    } else if (beatDetektor.current_bpm_valid()) {
      setMeasuredBpm(Math.round(beatDetektor.current_bpm))
    }

    // Render FFT data
    renderContext.renderFFT(beatDetektor, normalizedData, 0, 0, canvas.width, canvas.height - 40)

    // Render beat grid
    renderContext.renderBeatGrid(beatDetektor, timer_seconds, 0, canvas.height - 40, canvas.width, 40)

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
    if (beatDetektorRef.current) {
      beatDetektorRef.current.reset()
    }
    setBeatPositions([])
    setMeasuredBpm(null)
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get workout intensity based on BPM
  const getWorkoutIntensity = (bpm: number) => {
    if (bpm < 90) return "Low intensity (warm-up, cool-down, stretching)"
    if (bpm < 120) return "Moderate intensity (steady-state cardio, light strength training)"
    if (bpm < 140) return "Medium-high intensity (jogging, cycling, aerobics)"
    if (bpm < 160) return "High intensity (running, HIIT, power training)"
    return "Very high intensity (sprinting, maximum effort intervals)"
  }

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
        {previewUrl && (
          <audio ref={audioRef} src={previewUrl} preload="auto" className="hidden" crossOrigin="anonymous" />
        )}

        {/* Beat visualization */}
        <div className="relative h-60 bg-muted rounded-md overflow-hidden">
          <canvas ref={canvasRef} width={800} height={300} className="absolute inset-0 w-full h-full" />

          {/* Timeline with beat markers */}
          <div className="absolute bottom-0 left-0 w-full h-6 bg-black/20">
            {/* Current position */}
            <div
              className="absolute bottom-0 w-0.5 h-full bg-white"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />

            {/* Beat markers */}
            {beatPositions.map((time, index) => (
              <div
                key={index}
                className="absolute bottom-0 w-0.5 h-full bg-red-500"
                style={{ left: `${(time / duration) * 100}%` }}
              />
            ))}
          </div>

          {/* BPM display */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {isLoading ? (
              <div className="animate-pulse">Loading...</div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : !previewUrl ? (
              <div className="text-muted-foreground">No preview available</div>
            ) : !isPlaying ? (
              <div className="text-xl font-bold text-primary-foreground mix-blend-difference">
                Press play to analyze
              </div>
            ) : measuredBpm ? (
              <div className="text-4xl font-bold text-primary-foreground mix-blend-difference">{measuredBpm} BPM</div>
            ) : (
              <div className="text-xl font-bold text-primary-foreground mix-blend-difference animate-pulse">
                Analyzing...
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

        {/* Basic BPM information (always visible) */}
        {(measuredBpm !== null || spotifyBpm !== null) && (
          <div className="text-sm space-y-2 bg-muted/50 p-3 rounded-md">
            <p>
              <span className="font-medium">BPM:</span> {measuredBpm || spotifyBpm || "Analyzing..."}
            </p>
            <div className="mt-3">
              <p className="font-medium">Workout Intensity:</p>
              <p className="text-sm mt-1">{getWorkoutIntensity(measuredBpm || spotifyBpm || 0)}</p>
            </div>
          </div>
        )}

        {/* Detailed debug information (only visible in admin mode) */}
        {adminMode && (measuredBpm !== null || spotifyBpm !== null) && (
          <div className="mt-4 text-sm space-y-2 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Debug Information</h4>
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
            <p>
              <span className="font-medium">Algorithm:</span> BeatDetektor
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
