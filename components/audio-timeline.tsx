"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface TimeMarker {
  id: string
  time: number
  label: string
  title?: string // Add title field
}

interface AudioTimelineProps {
  duration: number
  currentTime: number
  timeMarkers: TimeMarker[]
  onSeek: (time: number) => void
  isPlaying: boolean
  className?: string
}

export function AudioTimeline({
  duration,
  currentTime,
  timeMarkers,
  onSeek,
  isPlaying,
  className,
}: AudioTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [hoveredTime, setHoveredTime] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Handle timeline click/drag
  const handleTimelineInteraction = (clientX: number) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const offsetX = clientX - rect.left
    const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1)
    const newTime = percentage * duration

    onSeek(newTime)
  }

  // Handle mouse movement over timeline
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1)

    setHoveredTime(percentage * duration)

    if (isDragging) {
      handleTimelineInteraction(e.clientX)
    }
  }

  // Handle mouse down on timeline
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    handleTimelineInteraction(e.clientX)
  }

  // Handle mouse up (end dragging)
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  // Calculate progress percentage
  const progressPercentage = (currentTime / duration) * 100

  return (
    <div className={cn("space-y-2", className)}>
      {/* Timeline */}
      <div
        ref={timelineRef}
        className="relative h-10 bg-gray-100 dark:bg-gray-800 rounded-md cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={() => setHoveredTime(null)}
      >
        {/* Progress bar */}
        <div
          className="absolute h-full bg-pink-200 dark:bg-pink-800 rounded-md pointer-events-none"
          style={{ width: `${progressPercentage}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-pink-500 transform -translate-x-1/2 pointer-events-none"
          style={{ left: `${progressPercentage}%` }}
        >
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full bg-pink-500" />
        </div>

        {/* Time markers */}
        {timeMarkers.map((marker) => {
          const markerPosition = (marker.time / duration) * 100
          const isPassed = currentTime >= marker.time
          const isApproaching = currentTime >= marker.time - 3 && currentTime < marker.time

          return (
            <div
              key={marker.id}
              className={cn(
                "absolute top-0 h-full w-0.5 transform -translate-x-1/2 pointer-events-none",
                isPassed ? "bg-green-500" : isApproaching ? "bg-yellow-500" : "bg-blue-500",
              )}
              style={{ left: `${markerPosition}%` }}
            >
              <div
                className={cn(
                  "absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full",
                  isPassed ? "bg-green-500" : isApproaching ? "bg-yellow-500" : "bg-blue-500",
                )}
              />
              {/* Marker title (if available) */}
              {marker.title && (
                <div
                  className={cn(
                    "absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap max-w-[120px] truncate",
                    isPassed
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      : isApproaching
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
                  )}
                >
                  {marker.title}
                </div>
              )}
              <div
                className={cn(
                  "absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap",
                  isPassed ? "text-green-500" : isApproaching ? "text-yellow-500" : "text-blue-500",
                )}
              >
                {marker.label}
              </div>
            </div>
          )
        })}

        {/* Hover indicator */}
        {hoveredTime !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-400 transform -translate-x-1/2 pointer-events-none"
            style={{ left: `${(hoveredTime / duration) * 100}%` }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-1 py-0.5 rounded">
              {formatTime(hoveredTime)}
            </div>
          </div>
        )}
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
