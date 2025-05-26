"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipForward, SkipBack, Music, RefreshCw, Settings } from "lucide-react"
import { getTrackAudioFeatures } from "@/lib/spotify-search"
import { cn } from "@/lib/utils"

interface ImprovedBeatAnalyzerProps {
  trackId: string
  trackName: string
  artistName: string
  previewUrl?: string | null
  className?: string
}

export function ImprovedBeatAnalyzer({
  trackId,
  trackName,
  artistName,
  previewUrl,
  className,
}: ImprovedBeatAnalyzerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30) // Default for preview
  const [spotifyBpm, setSpotifyBpm] = useState<number | null>(null)
  const [measuredBpm, setMeasuredBpm] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [energyLevels, setEnergyLevels] = useState<number[]>(Array(100).fill(0))
  const [beatInstants, setBeatInstants] = useState<number[]>([])
  const [sensitivity, setSensitivity] = useState(1.5) // Adjustable sensitivity
  const [showAdvanced, setShowAdvanced] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const energyHistoryRef = useRef<number[]>([])
  const thresholdRef = useRef<number>(0)
  const lastBeatTimeRef = useRef<number>(0)
  const animationRef = useRef<number | null>(null)
  const beatIntervalsRef = useRef<number[]>([])

  // Canvas for visualization
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

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

    // Reset analysis state
    energyHistoryRef.current = []
    thresholdRef.current = 0
    lastBeatTimeRef.current = 0
    beatIntervalsRef.current = []
    setBeatInstants([])
    setMeasuredBpm(null)

    // Create analyzer if it doesn't exist
    if (!analyserRef.current) {
      const audioContext = audioContextRef.current
      const audioSource = audioContext.createMediaElementSource(audioRef.current)
      const analyser = audioContext.createAnalyser()

      // Connect the audio source to the analyzer and then to the destination
      audioSource.connect(analyser)
      analyser.connect(audioContext.destination)

      // Configure analyzer
      analyser.fftSize = 1024 // Higher resolution for better analysis
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
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(animateAnalysis)
      return
    }

    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      animationRef.current = requestAnimationFrame(animateAnalysis)
      return
    }

    // Get frequency data
    analyser.getByteFrequencyData(dataArray)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate energy in different frequency bands
    // Low frequencies (bass/kick drum): 20Hz-150Hz
    // For a 44.1kHz sample rate and fftSize of 1024, each bin is about 43Hz wide
    // So the first ~3-4 bins cover our bass range
    let bassEnergy = 0
    const bassRange = { start: 0, end: 4 }
    for (let i = bassRange.start; i < bassRange.end; i++) {
      bassEnergy += dataArray[i]
    }
    bassEnergy /= (bassRange.end - bassRange.start) * 255 // Normalize to 0-1

    // Store energy history
    energyHistoryRef.current.push(bassEnergy)

    // Keep a rolling window of energy values
    const historySize = 50
    if (energyHistoryRef.current.length > historySize) {
      energyHistoryRef.current = energyHistoryRef.current.slice(-historySize)
    }

    // Calculate dynamic threshold using a moving average
    const movingAvg = energyHistoryRef.current.reduce((sum, val) => sum + val, 0) / energyHistoryRef.current.length

    // Set threshold to be slightly above the moving average
    // The sensitivity factor controls how much above the average to set the threshold
    thresholdRef.current = movingAvg * sensitivity

    // Beat detection - look for energy spikes above the dynamic threshold
    const now = performance.now()
    const minTimeBetweenBeats = 200 // ms, limits max BPM to 300

    if (
      bassEnergy > thresholdRef.current &&
      now - lastBeatTimeRef.current > minTimeBetweenBeats &&
      energyHistoryRef.current.length > 10
    ) {
      // Wait for some history to build up

      // Record beat time
      const beatTime = now

      // Calculate interval from previous beat
      if (lastBeatTimeRef.current > 0) {
        const interval = beatTime - lastBeatTimeRef.current
        beatIntervalsRef.current.push(interval)

        // Keep only recent intervals for BPM calculation
        if (beatIntervalsRef.current.length > 10) {
          beatIntervalsRef.current = beatIntervalsRef.current.slice(-10)
        }

        // Calculate BPM if we have enough intervals
        if (beatIntervalsRef.current.length >= 4) {
          // Sort intervals and take the middle 60% to remove outliers
          const sortedIntervals = [...beatIntervalsRef.current].sort((a, b) => a - b)
          const startIdx = Math.floor(sortedIntervals.length * 0.2)
          const endIdx = Math.floor(sortedIntervals.length * 0.8)
          const filteredIntervals = sortedIntervals.slice(startIdx, endIdx)

          // Calculate average interval
          const avgInterval = filteredIntervals.reduce((sum, val) => sum + val, 0) / filteredIntervals.length

          // Convert to BPM: 60000ms (1 minute) / average interval in ms
          const calculatedBpm = Math.round(60000 / avgInterval)

          // Only update if the BPM is in a reasonable range (40-220)
          if (calculatedBpm >= 40 && calculatedBpm <= 220) {
            setMeasuredBpm(calculatedBpm)
          }
        }
      }

      // Update last beat time
      lastBeatTimeRef.current = beatTime

      // Add to beat instants for visualization
      setBeatInstants((prev) => [...prev, currentTime])
    }

    // Update energy levels for visualization
    setEnergyLevels((prev) => {
      const newLevels = [...prev]
      newLevels.shift() // Remove oldest
      newLevels.push(bassEnergy) // Add newest
      return newLevels
    })

    // Draw frequency spectrum
    const barWidth = canvas.width / (analyser.frequencyBinCount / 4) // Only show lower quarter of spectrum
    let x = 0

    for (let i = 0; i < analyser.frequencyBinCount / 4; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height

      // Color gradient based on frequency
      const hue = (i / (analyser.frequencyBinCount / 4)) * 120 // 0-120 (red to green)
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`

      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

      x += barWidth
    }

    // Draw threshold line
    ctx.beginPath()
    ctx.moveTo(0, canvas.height - thresholdRef.current * canvas.height)
    ctx.lineTo(canvas.width, canvas.height - thresholdRef.current * canvas.height)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
    ctx.stroke()

    // Draw current energy level
    ctx.fillStyle = bassEnergy > thresholdRef.current ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 255, 0, 0.5)"
    ctx.fillRect(0, canvas.height - bassEnergy * canvas.height, 20, 5)

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
    energyHistoryRef.current = []
    thresholdRef.current = 0
    lastBeatTimeRef.current = 0
    beatIntervalsRef.current = []
    setBeatInstants([])
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={showAdvanced ? "bg-primary/10" : ""}
            >
              <Settings className="h-4 w-4" />
            </Button>
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
        <div className="relative h-40 bg-muted rounded-md overflow-hidden">
          <canvas ref={canvasRef} width={800} height={200} className="absolute inset-0 w-full h-full" />

          {/* Beat markers on timeline */}
          <div className="absolute bottom-0 left-0 w-full h-4 bg-black/20">
            {beatInstants.map((time, index) => (
              <div
                key={index}
                className="absolute bottom-0 w-0.5 h-4 bg-red-500"
                style={{ left: `${(time / duration) * 100}%` }}
              />
            ))}

            {/* Current position */}
            <div
              className="absolute bottom-0 w-0.5 h-full bg-white"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* BPM display */}
          <div className="absolute inset-0 flex items-center justify-center">
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

        {/* Advanced settings */}
        {showAdvanced && (
          <div className="p-3 bg-muted/50 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sensitivity">Detection Sensitivity</Label>
              <span className="text-sm">{sensitivity.toFixed(1)}</span>
            </div>
            <Slider
              id="sensitivity"
              min={1.0}
              max={2.0}
              step={0.1}
              value={[sensitivity]}
              onValueChange={(values) => setSensitivity(values[0])}
            />
            <p className="text-xs text-muted-foreground">
              Higher values make beat detection more sensitive, but may cause false positives.
            </p>
          </div>
        )}

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
            <div className="mt-3 pt-3 border-t border-muted-foreground/20">
              <p className="font-medium">Workout Intensity:</p>
              <p className="text-sm mt-1">{getWorkoutIntensity(measuredBpm || spotifyBpm || 0)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
