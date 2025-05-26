// Client-side Spotify API utilities

/**
 * Fetch the user's Spotify playlists
 */
export async function fetchUserPlaylists() {
  try {
    // First, check if we need to refresh the token
    await ensureValidToken()

    // Get the access token from cookies
    const accessToken = getAccessToken()

    if (!accessToken) {
      throw new Error("No access token available")
    }

    const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try refreshing and retrying once
        await refreshAccessToken()
        return fetchUserPlaylists()
      }
      throw new Error(`Failed to fetch playlists: ${response.status}`)
    }

    const data = await response.json()
    return data.items
  } catch (error) {
    console.error("Error fetching playlists:", error)
    throw error
  }
}

/**
 * Get a playlist's details including tracks
 */
export async function fetchPlaylistDetails(playlistId: string) {
  try {
    await ensureValidToken()
    const accessToken = getAccessToken()

    if (!accessToken) {
      throw new Error("No access token available")
    }

    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        await refreshAccessToken()
        return fetchPlaylistDetails(playlistId)
      }
      throw new Error(`Failed to fetch playlist details: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error("Error fetching playlist details:", error)
    throw error
  }
}

/**
 * Get track details
 */
export async function fetchTrackDetails(trackId: string) {
  try {
    await ensureValidToken()
    const accessToken = getAccessToken()

    if (!accessToken) {
      throw new Error("No access token available")
    }

    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        await refreshAccessToken()
        return fetchTrackDetails(trackId)
      }
      throw new Error(`Failed to fetch track details: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    console.error("Error fetching track details:", error)
    throw error
  }
}

/**
 * Get the current access token from cookies or localStorage
 */
function getAccessToken(): string | null {
  // Try to get from cookie first
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("spotify_access_token="))
    ?.split("=")[1]

  if (cookieToken) {
    return cookieToken
  }

  // If not in cookie, try localStorage
  return localStorage.getItem("spotify_access_token")
}

/**
 * Ensure we have a valid token, refreshing if necessary
 */
async function ensureValidToken() {
  // This is a simplified check - in a real app you'd check expiration
  const token = getAccessToken()
  if (!token) {
    await refreshAccessToken()
  }
}

/**
 * Refresh the access token
 */
async function refreshAccessToken() {
  try {
    const response = await fetch("/api/spotify/refresh-token", {
      method: "POST",
    })

    if (!response.ok) {
      throw new Error("Failed to refresh token")
    }

    const data = await response.json()

    // Store in localStorage for client access
    if (data.accessToken) {
      localStorage.setItem("spotify_access_token", data.accessToken)
    }

    return data
  } catch (error) {
    console.error("Error refreshing token:", error)
    throw error
  }
}
