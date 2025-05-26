// Utility functions for searching Spotify

/**
 * Search for tracks on Spotify based on criteria
 */
export async function searchSpotifyTracks(
  query: string,
  limit = 20,
  minTempo?: number,
  maxTempo?: number,
): Promise<any[]> {
  try {
    // Ensure we have a valid token
    const accessToken = localStorage.getItem("spotify_access_token")
    if (!accessToken) {
      throw new Error("No Spotify access token available")
    }

    // Build the search query
    const searchQuery = query

    // Execute the search
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status}`)
    }

    const data = await response.json()
    const tracks = data.tracks.items

    // If we need to filter by tempo, we need to get audio features for each track
    if (minTempo || maxTempo) {
      try {
        // Get track IDs
        const trackIds = tracks.map((track: any) => track.id).join(",")

        // Get audio features for all tracks in one request
        const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!featuresResponse.ok) {
          console.error(`Failed to get audio features: ${featuresResponse.status}`)
          // If we can't get audio features, just return the tracks without filtering
          return tracks
        }

        const featuresData = await featuresResponse.json()
        const audioFeatures = featuresData.audio_features

        // Create a map of track ID to its audio features
        const featuresMap = new Map()
        audioFeatures.forEach((features: any) => {
          if (features) {
            featuresMap.set(features.id, features)
          }
        })

        // Filter tracks by tempo if needed
        return tracks.filter((track: any) => {
          const features = featuresMap.get(track.id)
          if (!features) return true // Include tracks without features

          if (minTempo && features.tempo < minTempo) return false
          if (maxTempo && features.tempo > maxTempo) return false

          return true
        })
      } catch (error) {
        console.error("Error getting audio features:", error)
        // If there's an error, return the tracks without filtering
        return tracks
      }
    }

    return tracks
  } catch (error) {
    console.error("Error searching Spotify:", error)
    throw error
  }
}

/**
 * Get audio features for a track
 */
export async function getTrackAudioFeatures(trackId: string): Promise<any> {
  try {
    const accessToken = localStorage.getItem("spotify_access_token")
    if (!accessToken) {
      throw new Error("No Spotify access token available")
    }

    const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error(`Failed to get audio features: ${response.status}`)
      // Return a default object with estimated values
      return {
        tempo: 120, // Default BPM
        energy: 0.7,
        danceability: 0.7,
        valence: 0.5,
        id: trackId,
      }
    }

    return response.json()
  } catch (error) {
    console.error("Error getting audio features:", error)
    // Return a default object with estimated values
    return {
      tempo: 120, // Default BPM
      energy: 0.7,
      danceability: 0.7,
      valence: 0.5,
      id: trackId,
    }
  }
}

/**
 * Create a playlist on Spotify
 */
export async function createSpotifyPlaylist(
  userId: string,
  name: string,
  description: string,
  trackUris: string[],
  isPublic = false,
): Promise<any> {
  try {
    const accessToken = localStorage.getItem("spotify_access_token")
    if (!accessToken) {
      throw new Error("No Spotify access token available")
    }

    // Create the playlist
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
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

    if (!createResponse.ok) {
      throw new Error(`Failed to create playlist: ${createResponse.status}`)
    }

    const playlist = await createResponse.json()

    // Add tracks to the playlist
    if (trackUris.length > 0) {
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: trackUris,
        }),
      })

      if (!addTracksResponse.ok) {
        throw new Error(`Failed to add tracks to playlist: ${addTracksResponse.status}`)
      }
    }

    return playlist
  } catch (error) {
    console.error("Error creating playlist:", error)
    throw error
  }
}
