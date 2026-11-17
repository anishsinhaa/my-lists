import { Bookmark, Check, Clock, Heart, Pause, Play, ShoppingCart, Sparkles, X, type LucideIcon } from 'lucide-react'
import type { StatusIcon } from './statusConfig'

const ICONS: Record<StatusIcon, LucideIcon> = {
  play: Play,
  pause: Pause,
  check: Check,
  clock: Clock,
  bookmark: Bookmark,
  heart: Heart,
  cart: ShoppingCart,
  x: X,
  spark: Sparkles,
}

export function StatusGlyph({ name, className = 'size-3.5' }: { name: StatusIcon; className?: string }) {
  const Icon = ICONS[name]
  return <Icon aria-hidden="true" className={className} />
}
