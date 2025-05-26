// This file now serves as a bridge between the AI generator and the Spotify API
// The actual implementation is in spotify-search.ts

import { searchSpotifyTracks, getTrackAudioFeatures } from "./spotify-search"

// Types
export interface PlaylistParams {
  name: string
  description: string
  workoutType: string
  duration: number
  bpm: number
  intensity: number
  vibe: string
}

export interface Track {
  id: string
  uri: string
  title: string
  artist: string
  album?: string
  duration: string
  bpm: number
  image?: string
}

export interface GeneratedPlaylist {
  name: string
  description: string
  duration: number
  averageBpm: number
  tracks: Track[]
}

// Format milliseconds to MM:SS
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

// This function is now a wrapper around our Spotify search functionality
export async function generateAIPlaylist(params: PlaylistParams): Promise<GeneratedPlaylist> {
  try {
    // Calculate BPM range based on intensity
    const bpmVariance = 10 + params.intensity * 2
    const minBpm = Math.max(params.bpm - bpmVariance, 60)
    const maxBpm = params.bpm + bpmVariance

    // Calculate number of tracks based on duration (assuming ~3.5 mins per track)
    const tracksNeeded = Math.ceil(params.duration / 3.5)

    // Build search queries based on workout type and vibe
    const searchTerms: string[] = []

    // Add workout type specific terms
    switch (params.workoutType) {
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
    if (params.vibe) {
      searchTerms.push(...params.vibe.split(" "))
    }

    // Randomize and select a few terms for variety
    const shuffledTerms = searchTerms.sort(() => 0.5 - Math.random())
    const selectedTerms = shuffledTerms.slice(0, 3).join(" ")

    // Search for tracks
    const tracks = await searchSpotifyTracks(selectedTerms, tracksNeeded * 3, minBpm, maxBpm)

    if (tracks.length === 0) {
      throw new Error("No tracks found matching your criteria. Try adjusting your preferences.")
    }

    // Get audio features for all tracks to sort by BPM
    let tracksWithFeatures = []
    try {
      tracksWithFeatures = await Promise.all(
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
    } catch (error) {
      console.error("Error getting audio features:", error)
      // Fallback: Just use the tracks without audio features
      tracksWithFeatures = tracks.slice(0, tracksNeeded).map((track) => ({
        ...track,
        features: {
          tempo: 120, // Default BPM
          energy: 0.7,
          danceability: 0.7,
          valence: 0.5,
        },
      }))
    }

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
    return {
      name: params.name,
      description: params.description || `${params.workoutType} workout with ${params.vibe} vibes`,
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
  } catch (error) {
    console.error("Error generating playlist:", error)
    throw error
  }
}
