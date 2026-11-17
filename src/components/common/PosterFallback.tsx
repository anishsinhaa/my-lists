import { BookOpen, Clapperboard, Gamepad2, Shapes, Sparkles, Tv } from 'lucide-react'
import type { MediaKind } from '@/types/lists'

const ICONS: Record<MediaKind, typeof Clapperboard> = {
  movie: Clapperboard,
  series: Tv,
  anime: Sparkles,
  game: Gamepad2,
  book: BookOpen,
  other: Shapes,
}

function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter((word) => word.length > 0)
  const first = words[0]
  const second = words[1]
  if (first === undefined) return '?'
  if (second === undefined) return first.slice(0, 2).toUpperCase()
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase()
}

export function PosterFallback({ title, kind, className = '' }: { title: string; kind: MediaKind; className?: string }) {
  if (kind === 'book') {
    return (
      <div className={`flex h-full w-full items-end bg-[#6b3e2a] p-3 ${className}`}>
        <span className="font-['EB_Garamond',serif] text-lg leading-tight text-[#f6e7cf]">{title}</span>
      </div>
    )
  }
  const Icon = ICONS[kind]
  return (
    <div className={`flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,var(--accent),var(--surface-2))] ${className}`}>
      <div className="flex flex-col items-center gap-1 rounded-md bg-[#111418] px-2 py-1 text-[#f4f4f5]">
        <Icon aria-hidden="true" className="size-5" />
        <span className="text-center font-(--font-display) text-sm leading-none">{initials(title)}</span>
      </div>
    </div>
  )
}
