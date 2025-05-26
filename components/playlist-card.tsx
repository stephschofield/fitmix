import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Clock, Music, Play, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlaylistCardProps {
  playlist: {
    id: string
    title: string
    description: string
    songs: number
    duration: string
    coverUrl: string
  }
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-lg shadow-pink-500/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm hover:shadow-xl hover:shadow-pink-500/20 transition-all group">
      <CardHeader className="p-0">
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={playlist.coverUrl || "/placeholder.svg"}
            alt={playlist.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="icon" className="rounded-full bg-white text-black hover:bg-white/90 h-12 w-12">
              <Play className="h-6 w-6 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg">{playlist.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{playlist.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Music className="mr-1 h-4 w-4" />
            <span>{playlist.songs} songs</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-1 h-4 w-4" />
            <span>{playlist.duration}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Link href={`/playlist/${playlist.id}`} className="w-full">
          <Button
            variant="outline"
            className="w-full gap-2 hover:bg-gradient-to-r hover:from-pink-500 hover:to-violet-500 hover:text-white hover:border-transparent"
          >
            <Edit className="h-4 w-4" />
            Edit Playlist
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
