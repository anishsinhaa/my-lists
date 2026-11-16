export type ThemeId = 'home' | 'movies' | 'series' | 'anime' | 'games' | 'books' | 'other'

export interface MotionSpec {
  fast: number
  base: number
  slow: number
  ease: [number, number, number, number]
  spring: { stiffness: number; damping: number; mass: number }
  stagger: number
}

export interface ThemeSpec {
  id: ThemeId
  label: string
  colors: {
    bg: string
    surface: string
    surface2: string
    ink: string
    inkMuted: string
    accent: string
    accent2: string
    border: string
  }
  fonts: { display: string; body: string }
  radiusPx: number
  motion: MotionSpec
  cardStyle: string
}
