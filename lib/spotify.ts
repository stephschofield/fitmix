// Utility functions for Spotify API integration

// Get environment variables with fallbacks and logging
const getEnvVar = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing environment variable: ${name}`)
    return ""
  }
  return value
}

// Log environment variables for debugging (without exposing secrets)
console.log("SPOTIFY_CLIENT_ID exists:", !!process.env.SPOTIFY_CLIENT_ID)
console.log("SPOTIFY_CLIENT_SECRET exists:", !!process.env.SPOTIFY_CLIENT_SECRET)
console.log("SPOTIFY_REDIRECT_URI:", process.env.SPOTIFY_REDIRECT_URI)

const SPOTIFY_CLIENT_ID = getEnvVar("SPOTIFY_CLIENT_ID")
const SPOTIFY_CLIENT_SECRET = getEnvVar("SPOTIFY_CLIENT_SECRET")
const SPOTIFY_REDIRECT_URI = getEnvVar("SPOTIFY_REDIRECT_URI")

// Scopes for Spotify API access
export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
].join(" ")

// Generate the Spotify authorization URL
export function getSpotifyAuthUrl(state: string) {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error("Missing SPOTIFY_CLIENT_ID environment variable")
  }

  if (!SPOTIFY_REDIRECT_URI) {
    throw new Error("Missing SPOTIFY_REDIRECT_URI environment variable")
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
    throw new Error("Missing required Spotify environment variables")
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token exchange error:", errorText)
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status} - ${errorText}`)
    }

    return tokenResponse.json()
  } catch (error) {
    console.error("Token exchange error:", error)
    throw error
  }
}

// Refresh an access token
export async function refreshAccessToken(refreshToken: string) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Missing required Spotify environment variables")
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Token refresh error:", errorText)
      throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error("Token refresh error:", error)
    throw error
  }
}

// Get user profile from Spotify
export async function getSpotifyUserProfile(accessToken: string) {
  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Profile fetch error:", errorText)
      throw new Error(`Failed to fetch user profile: ${response.status} - ${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error("Profile fetch error:", error)
    throw error
  }
}

// Get user's playlists from Spotify
export async function getUserPlaylists(accessToken: string, limit = 50, offset = 0) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Playlists fetch error:", errorText)
      throw new Error(`Failed to fetch playlists: ${response.status} - ${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error("Playlists fetch error:", error)
    throw error
  }
}

// Create a new playlist on Spotify
export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
  isPublic = false,
) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Playlist creation error:", errorText)
      throw new Error(`Failed to create playlist: ${response.status} - ${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error("Playlist creation error:", error)
    throw error
  }
}

// Add tracks to a playlist
export async function addTracksToPlaylist(accessToken: string, playlistId: string, trackUris: string[]) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: trackUris,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Track addition error:", errorText)
      throw new Error(`Failed to add tracks to playlist: ${response.status} - ${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error("Track addition error:", error)
    throw error
  }
}
