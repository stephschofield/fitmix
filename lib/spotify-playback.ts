// Spotify Web Playback SDK utility functions

// Type definitions for the Spotify Player
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
    }
  }
}

interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (callback: (token: string) => void) => void
  volume?: number
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, callback: (...args: any[]) => void) => void
  removeListener: (event: string, callback?: (...args: any[]) => void) => void
  getCurrentState: () => Promise<SpotifyPlaybackState | null>
  setName: (name: string) => Promise<void>
  getVolume: () => Promise<number>
  setVolume: (volume: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  togglePlay: () => Promise<void>
  seek: (position_ms: number) => Promise<void>
  previousTrack: () => Promise<void>
  nextTrack: () => Promise<void>
}

interface SpotifyPlaybackState {
  context: {
    uri: string
    metadata: any
  }
  disallows: {
    pausing: boolean
    peeking_next: boolean
    peeking_prev: boolean
    resuming: boolean
    seeking: boolean
    skipping_next: boolean
    skipping_prev: boolean
  }
  duration: number
  paused: boolean
  position: number
  repeat_mode: number
  shuffle: boolean
  track_window: {
    current_track: SpotifyTrack
    previous_tracks: SpotifyTrack[]
    next_tracks: SpotifyTrack[]
  }
}

interface SpotifyTrack {
  id: string
  uri: string
  type: string
  media_type: string
  name: string
  duration_ms: number
  artists: Array<{
    name: string
    uri: string
  }>
  album: {
    uri: string
    name: string
    images: Array<{
      url: string
    }>
  }
  is_playable: boolean
}

// Singleton instance of the Spotify Player
let spotifyPlayer: SpotifyPlayer | null = null
let deviceId: string | null = null

// Load the Spotify Web Playback SDK script
export function loadSpotifyPlaybackSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If the SDK is already loaded, resolve immediately
    if (window.Spotify) {
      resolve()
      return
    }

    // Create script element
    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true

    // Set up callback for when SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve()
    }

    // Handle errors
    script.onerror = (error) => {
      reject(new Error("Failed to load Spotify Web Playback SDK"))
    }

    // Add script to document
    document.body.appendChild(script)
  })
}

// Initialize the Spotify Player
export async function initializePlayer(accessToken: string, name = "FitMix Player"): Promise<boolean> {
  try {
    // Load the SDK if not already loaded
    await loadSpotifyPlaybackSDK()

    // Create a new player if one doesn't exist
    if (!spotifyPlayer) {
      spotifyPlayer = new window.Spotify.Player({
        name,
        getOAuthToken: (cb) => {
          cb(accessToken)
        },
        volume: 0.5,
      })

      // Error handling
      spotifyPlayer.addListener("initialization_error", ({ message }) => {
        console.error("Initialization error:", message)
      })

      spotifyPlayer.addListener("authentication_error", ({ message }) => {
        console.error("Authentication error:", message)
      })

      spotifyPlayer.addListener("account_error", ({ message }) => {
        console.error("Account error:", message)
      })

      spotifyPlayer.addListener("playback_error", ({ message }) => {
        console.error("Playback error:", message)
      })

      // Device ID received
      spotifyPlayer.addListener("ready", ({ device_id }) => {
        console.log("Ready with Device ID", device_id)
        deviceId = device_id
      })

      // Device ID has changed
      spotifyPlayer.addListener("not_ready", ({ device_id }) => {
        console.log("Device ID has changed", device_id)
        deviceId = null
      })
    }

    // Connect to the player
    const connected = await spotifyPlayer.connect()
    return connected
  } catch (error) {
    console.error("Error initializing Spotify player:", error)
    return false
  }
}

// Get the current player
export function getPlayer(): SpotifyPlayer | null {
  return spotifyPlayer
}

// Get the device ID
export function getDeviceId(): string | null {
  return deviceId
}

// Play a specific track
export async function playTrack(uri: string, position_ms = 0): Promise<boolean> {
  try {
    if (!deviceId) {
      console.error("No device ID available")
      return false
    }

    const accessToken = localStorage.getItem("spotify_access_token")
    if (!accessToken) {
      console.error("No access token available")
      return false
    }

    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        uris: [uri],
        position_ms,
      }),
    })

    return response.status === 204
  } catch (error) {
    console.error("Error playing track:", error)
    return false
  }
}

// Seek to a specific position in the current track
export async function seekToPosition(position_ms: number): Promise<boolean> {
  try {
    if (!spotifyPlayer) {
      console.error("Spotify player not initialized")
      return false
    }

    await spotifyPlayer.seek(position_ms)
    return true
  } catch (error) {
    console.error("Error seeking to position:", error)
    return false
  }
}

// Toggle play/pause
export async function togglePlayback(): Promise<boolean> {
  try {
    if (!spotifyPlayer) {
      console.error("Spotify player not initialized")
      return false
    }

    await spotifyPlayer.togglePlay()
    return true
  } catch (error) {
    console.error("Error toggling playback:", error)
    return false
  }
}

// Get current playback state
export async function getPlaybackState(): Promise<SpotifyPlaybackState | null> {
  try {
    if (!spotifyPlayer) {
      console.error("Spotify player not initialized")
      return null
    }

    return await spotifyPlayer.getCurrentState()
  } catch (error) {
    console.error("Error getting playback state:", error)
    return null
  }
}

// Clean up the player
export function disconnectPlayer(): void {
  if (spotifyPlayer) {
    spotifyPlayer.disconnect()
    spotifyPlayer = null
    deviceId = null
  }
}
