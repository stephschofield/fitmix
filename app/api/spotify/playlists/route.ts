import { type NextRequest, NextResponse } from "next/server"

/**
 * This route handler fetches the user's Spotify playlists
 * In a real app, you would use the stored access token to make requests to Spotify API
 */
export async function GET(request: NextRequest) {
  // Mock data - in a real app this would fetch from Spotify API
  const mockPlaylists = [
    {
      id: "spotify1",
      name: "Workout Favorites",
      description: "My favorite workout tracks",
      tracks: { total: 25 },
      images: [{ url: "/placeholder.svg?height=300&width=300" }],
    },
    {
      id: "spotify2",
      name: "Running Mix",
      description: "Perfect for morning runs",
      tracks: { total: 18 },
      images: [{ url: "/placeholder.svg?height=300&width=300" }],
    },
    {
      id: "spotify3",
      name: "Yoga & Meditation",
      description: "Calm tracks for yoga sessions",
      tracks: { total: 12 },
      images: [{ url: "/placeholder.svg?height=300&width=300" }],
    },
  ]

  return NextResponse.json({ playlists: mockPlaylists })
}
