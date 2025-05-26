"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Flame, LogOut, Music2, Sparkles, User, Wand2, Zap, Dumbbell, Activity } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import SpotifyPlaylistView from "@/components/spotify-playlist-view"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

export default function DashboardPage() {
  const { toast } = useToast()
  const { user, logout, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("playlists")

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-pink-950 dark:via-purple-950 dark:to-blue-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse flex items-center gap-2">
            <Zap className="h-8 w-8 text-pink-500" />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              Loading...
            </span>
          </div>
          <Progress value={60} className="w-48 h-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-pink-950 dark:via-purple-950 dark:to-blue-950">
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-black/70 border-b border-pink-200 dark:border-pink-900">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-1.5 rounded-lg">
              <Music2 className="h-6 w-6 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">FitMix</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-pink-500">
              Dashboard
            </Link>
            <Link href="/playlists" className="text-sm font-medium transition-colors hover:text-pink-500">
              My Playlists
            </Link>
            <Link href="/create" className="text-sm font-medium transition-colors hover:text-pink-500">
              Create Playlist
            </Link>
            <Link href="/bpm-analyzer" className="text-sm font-medium transition-colors hover:text-pink-500">
              BPM Analyzer
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium hidden md:block">{user?.name || "User"}</span>
              <Avatar className="h-8 w-8 ring-2 ring-pink-500 ring-offset-2 ring-offset-background">
                <AvatarImage src={user?.image || "/placeholder.svg?height=32&width=32"} alt={user?.name || "Profile"} />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-violet-500 text-white">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="hover:bg-pink-100 hover:text-pink-500 dark:hover:bg-pink-900"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                Hey, {user?.name?.split(" ")[0] || "there"}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">Ready to create some epic workout playlists?</p>
            </div>
            <Link href="/create">
              <Button className="gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white border-none shadow-lg shadow-pink-500/20">
                <Sparkles className="h-4 w-4" />
                Create New Playlist
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-lg shadow-pink-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm hover:shadow-xl hover:shadow-pink-500/20 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Playlists Created</CardTitle>
                <div className="bg-pink-100 dark:bg-pink-900 p-2 rounded-full">
                  <Music2 className="h-4 w-4 text-pink-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">12</div>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-green-500 font-medium flex items-center">
                    <Zap className="h-3 w-3 mr-1" />
                    +2 from last month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg shadow-violet-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm hover:shadow-xl hover:shadow-violet-500/20 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Classes Taught</CardTitle>
                <div className="bg-violet-100 dark:bg-violet-900 p-2 rounded-full">
                  <User className="h-4 w-4 text-violet-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">24</div>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-green-500 font-medium flex items-center">
                    <Zap className="h-3 w-3 mr-1" />
                    +4 from last month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg shadow-blue-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm hover:shadow-xl hover:shadow-blue-500/20 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <Wand2 className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">7</div>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-green-500 font-medium flex items-center">
                    <Zap className="h-3 w-3 mr-1" />
                    +3 from last month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg shadow-orange-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm hover:shadow-xl hover:shadow-orange-500/20 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full">
                  <Clock className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">14 hrs</div>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-green-500 font-medium flex items-center">
                    <Zap className="h-3 w-3 mr-1" />
                    +2 hrs from last month
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg shadow-green-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm hover:shadow-xl hover:shadow-green-500/20 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">BPM Analyzer</CardTitle>
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">New</div>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground font-medium flex items-center">
                    Analyze song tempo for workouts
                  </span>
                </div>
                <Button
                  className="w-full mt-4 gap-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                  size="sm"
                  asChild
                >
                  <Link href="/bpm-analyzer">
                    <Activity className="h-4 w-4" />
                    Analyze BPM
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="spotify" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full md:w-auto grid-cols-2 p-1 bg-white/50 dark:bg-black/30 backdrop-blur-sm rounded-xl">
              <TabsTrigger
                value="spotify"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-violet-500 data-[state=active]:text-white"
              >
                <Music2 className="h-4 w-4 mr-2" />
                Spotify Playlists
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-violet-500 data-[state=active]:text-white"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                AI Generation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spotify" className="mt-6">
              <SpotifyPlaylistView />
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-lg shadow-violet-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5 text-violet-500" />
                      AI Playlist Generator
                    </CardTitle>
                    <CardDescription>Create custom playlists with AI based on your workout preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">Our AI can generate the perfect playlist for your workout based on:</p>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="bg-violet-100 dark:bg-violet-900 p-1 rounded-full">
                          <Dumbbell className="h-3 w-3 text-violet-500" />
                        </div>
                        <span>Workout type (HIIT, Cycling, Yoga, etc.)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="bg-pink-100 dark:bg-pink-900 p-1 rounded-full">
                          <Clock className="h-3 w-3 text-pink-500" />
                        </div>
                        <span>Duration and intensity</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="bg-blue-100 dark:bg-blue-900 p-1 rounded-full">
                          <Music2 className="h-3 w-3 text-blue-500" />
                        </div>
                        <span>Target BPM and musical preferences</span>
                      </li>
                    </ul>
                    <Link href="/ai-generator">
                      <Button className="w-full gap-2 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white border-none shadow-lg shadow-violet-500/20">
                        <Sparkles className="h-4 w-4" />
                        Create AI Playlist
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-none shadow-lg shadow-pink-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-pink-500" />
                        Why Use AI for Workout Playlists?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2">
                          <div className="bg-pink-100 dark:bg-pink-900 p-1 rounded-full mt-0.5">
                            <Zap className="h-3 w-3 text-pink-500" />
                          </div>
                          <span className="text-sm">Perfect pacing with warm-up, peak, and cool-down sections</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="bg-pink-100 dark:bg-pink-900 p-1 rounded-full mt-0.5">
                            <Zap className="h-3 w-3 text-pink-500" />
                          </div>
                          <span className="text-sm">BPM matched to your workout intensity needs</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="bg-pink-100 dark:bg-pink-900 p-1 rounded-full mt-0.5">
                            <Zap className="h-3 w-3 text-pink-500" />
                          </div>
                          <span className="text-sm">Discover new tracks that match your preferences</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
