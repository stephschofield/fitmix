"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Plus, SkipBack, SkipForward, Activity } from "lucide-react"
import { AudioTimeline } from "@/components/audio-timeline"
import { cn } from "@/lib/utils"
import { getTrackAudioFeatures } from "@/lib/spotify-search"

interface TimeMarker {
  id: string
  time: number
  label: string
  title?: string
}

interface TrackPlayerProps {
  trackId: string
  trackName: string
  artistName: string
  previewUrl: string | null
  duration: number // in seconds
  timeMarkers: Array<{ time: string; title?: string }> // in format "MM:SS" with optional title
  onAddTimeMarker: (time: number, title?: string) => void
  className?: string
}

export function TrackPlayer({
  trackId,
  trackName,
  artistName,
  previewUrl,
  duration,
  timeMarkers,
  onAddTimeMarker,
  className,
}: TrackPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markerTitle, setMarkerTitle] = useState("")
  const [bpm, setBpm] = useState<number | null>(null)
  const [showBpmVisualizer, setShowBpmVisualizer] = useState(false)

  // Audio analysis refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const energyHistoryRef = useRef<number[]>([])
  const thresholdRef = useRef<number>(0)
  const lastBeatTime = useRef<number>(0)
  const animationRef = useRef<number | null>(null)
  const beatIntervalsRef = useRef<number[]>([])
  const [energyLevel, setEnergyLevel] = useState<number>(0)

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

  // Load BPM data
  useEffect(() => {
    const loadBpmData = async () => {
      try {
        const features = await getTrackAudioFeatures(trackId)

        if (features && features.tempo) {
          setBpm(Math.round(features.tempo))
        }
      } catch (err) {
        console.error("Error loading BPM data:", err)
        // Don't set error - BPM is optional
      }
    }

    loadBpmData()
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
        // Don't set error - beat visualization is optional
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
    if (!audioRef.current) return

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => {
      setIsPlaying(true)

      // Start audio analysis when playing and visualizer is shown
      if (showBpmVisualizer && audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume()
      }

      if (showBpmVisualizer) {
        startAudioAnalysis()
      }
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

    const handleCanPlayThrough = () => {
      setIsLoaded(true)
      setError(null)
    }

    const handleError = () => {
      setError("Failed to load audio")
      setIsLoaded(false)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("canplaythrough", handleCanPlayThrough)
    audio.addEventListener("error", handleError)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("canplaythrough", handleCanPlayThrough)
      audio.removeEventListener("error", handleError)
    }
  }, [showBpmVisualizer])

  // Start audio analysis
  const startAudioAnalysis = () => {
    if (!audioRef.current || !audioContextRef.current || !previewUrl) return

    // Reset analysis state
    energyHistoryRef.current = []
    thresholdRef.current = 0
    lastBeatTime.current = 0
    beatIntervalsRef.current = []

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
    if (!analyserRef.current || !dataArrayRef.current) {
      animationRef.current = requestAnimationFrame(animateAnalysis)
      return
    }

    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current

    // Get frequency data
    analyser.getByteFrequencyData(dataArray)

    // Calculate energy in the low frequency range (bass/kick drum)
    let bassEnergy = 0
    const bassRange = { start: 0, end: 4 }
    for (let i = bassRange.start; i < bassRange.end; i++) {
      bassEnergy += dataArray[i]
    }
    bassEnergy /= (bassRange.end - bassRange.start) * 255 // Normalize to 0-1

    // Update energy level for visualization
    setEnergyLevel(bassEnergy)

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
    thresholdRef.current = movingAvg * 1.5

    // Beat detection - look for energy spikes above the dynamic threshold
    const now = performance.now()
    const minTimeBetweenBeats = 200 // ms, limits max BPM to 300

    if (
      bassEnergy > thresholdRef.current &&
      now - lastBeatTime.current > minTimeBetweenBeats &&
      energyHistoryRef.current.length > 10
    ) {
      // Wait for some history to build up

      // Record beat time
      const beatTime = now

      // Calculate interval from previous beat
      if (lastBeatTime.current > 0) {
        const interval = beatTime - lastBeatTime.current
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
            setBpm(calculatedBpm)
          }
        }
      }

      // Update last beat time
      lastBeatTime.current = beatTime
    }

    // Continue animation loop
    animationRef.current = requestAnimationFrame(animateAnalysis)
  }

  // Handle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) return

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

  // Handle skip forward/backward
  const skipForward = () => {
    if (!audioRef.current) return
    const newTime = Math.min(audioRef.current.currentTime + 5, duration)
    audioRef.current.currentTime = newTime
  }

  const skipBackward = () => {
    if (!audioRef.current) return
    const newTime = Math.max(audioRef.current.currentTime - 5, 0)
    audioRef.current.currentTime = newTime
  }

  // Add current time marker
  const addCurrentTimeMarker = () => {
    if (!audioRef.current) return
    onAddTimeMarker(audioRef.current.currentTime, markerTitle || undefined)
    setMarkerTitle("")
  }

  // Toggle BPM visualizer
  const toggleBpmVisualizer = () => {
    const newState = !showBpmVisualizer
    setShowBpmVisualizer(newState)

    // Start analysis if turning on visualizer and audio is playing
    if (newState && isPlaying && audioRef.current) {
      startAudioAnalysis()
    }

    // Stop analysis if turning off visualizer
    if (!newState && animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }

  // Calculate beat visualization
  const timeSinceLastBeat = performance.now() - lastBeatTime.current
  const beatVisualization = Math.max(0, 1 - timeSinceLastBeat / 300) // Fade over 300ms

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
            {bpm !== null && (
              <Badge variant="outline" className="bg-primary/10">
                {bpm} BPM
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
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleBpmVisualizer}
              className={showBpmVisualizer ? "bg-primary/10" : ""}
            >
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Audio element */}
        <audio ref={audioRef} src={previewUrl || undefined} preload="auto" className="hidden" />

        {/* BPM Visualizer */}
        {showBpmVisualizer && (
          <div className="relative h-16 bg-muted rounded-md overflow-hidden mb-2">
            {/* Energy level visualization */}
            <div
              className="absolute bottom-0 left-0 w-full bg-primary/30 transition-all duration-100"
              style={{ height: `${energyLevel * 100}%` }}
            />

            {/* Beat pulse */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                        w-12 h-12 rounded-full bg-primary transition-all duration-300"
              style={{
                opacity: beatVisualization * 0.7,
                transform: `translate(-50%, -50%) scale(${1 + beatVisualization})`,
              }}
            />

            {/* BPM display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-bold text-primary-foreground mix-blend-difference">
                {bpm || "Play to detect"} BPM
              </div>
            </div>
          </div>
        )}

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
            <Button variant="outline" size="icon" onClick={skipBackward} disabled={!previewUrl || !isLoaded}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlayback}
              disabled={!previewUrl || !isLoaded}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={skipForward} disabled={!previewUrl || !isLoaded}>
              <SkipForward className="h-4 w-4" />
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={addCurrentTimeMarker}
              disabled={!previewUrl || !isLoaded}
            >
              <Plus className="h-3 w-3" />
              Add at {formatTime(currentTime)}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-500 mt-2">
            {error} {!previewUrl && "(No preview available for this track)"}
          </p>
        )}
      </div>
    </Card>
  )
}
