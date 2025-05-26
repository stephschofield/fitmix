import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Music2, Dumbbell, Wand2, Sparkles } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-pink-950 dark:via-purple-950 dark:to-blue-950">
      <header className="border-b border-pink-200 dark:border-pink-900 backdrop-blur-md bg-white/70 dark:bg-black/70">
        <div className="container flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-1.5 rounded-lg">
              <Music2 className="h-6 w-6 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">FitMix</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white border-none shadow-lg shadow-pink-500/20">
                Login with Spotify
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-pink-500 to-violet-500 text-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Perfect Playlists for Perfect Workouts
                </h1>
                <p className="mx-auto max-w-[700px] text-lg md:text-xl text-pink-100">
                  Create, customize and time your music for fitness classes with Spotify integration
                </p>
              </div>
              <div className="space-x-4 mt-4">
                <Link href="/login">
                  <Button size="lg" className="gap-2 bg-white text-pink-500 hover:bg-pink-100 hover:text-pink-600">
                    <Sparkles className="h-5 w-5" />
                    Get Started with Spotify
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white/10"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              Supercharge Your Fitness Classes
            </h2>
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-lg shadow-pink-500/10 hover:shadow-xl hover:shadow-pink-500/20 transition-all">
                <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-3 rounded-full">
                  <Music2 className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold">Spotify Integration</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Connect your Spotify account to access all your playlists and favorite tracks.
                </p>
              </div>
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-lg shadow-pink-500/10 hover:shadow-xl hover:shadow-pink-500/20 transition-all">
                <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-3 rounded-full">
                  <Dumbbell className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold">Time Markers</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Add time markers to your songs for perfect workout pacing and transitions.
                </p>
              </div>
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-lg shadow-pink-500/10 hover:shadow-xl hover:shadow-pink-500/20 transition-all">
                <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-3 rounded-full">
                  <Wand2 className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold">AI Playlist Generation</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Create the perfect playlist based on theme, workout type and target RPM.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-pink-200 dark:border-pink-900">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:flex-row">
          <p className="text-center text-sm leading-loose text-gray-500 md:text-left">
            © 2024 FitMix. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-sm text-gray-500 hover:text-pink-500 hover:underline">
              Terms of Service
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-pink-500 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
