import type { MotionSpec, ThemeId, ThemeSpec } from '@/types/theme'

function motion(fast: number, base: number, slow: number, ease: MotionSpec['ease'], spring: MotionSpec['spring'], stagger: number): MotionSpec {
  return { fast, base, slow, ease, spring, stagger }
}

function spec(id: ThemeId, label: string, colors: ThemeSpec['colors'], fonts: ThemeSpec['fonts'], radiusPx: number, move: MotionSpec, cardStyle: string): ThemeSpec {
  return { id, label, colors, fonts, radiusPx, motion: move, cardStyle }
}

const inter = { display: "'Inter Variable', sans-serif", body: "'Inter Variable', sans-serif" }

export const THEME_SPECS: Record<ThemeId, ThemeSpec> = {
  home: spec('home', 'Home', { bg: '#0E0F13', surface: '#171921', surface2: '#20232D', ink: '#F3F4F6', inkMuted: '#9AA0AE', accent: '#7C9CFF', accent2: '#FF9F6B', border: '#2A2E3A' }, { display: "'Inter Variable', sans-serif", body: "'Inter Variable', sans-serif" }, 16, motion(180, 280, 450, [0.2, 0, 0, 1], { stiffness: 200, damping: 24, mass: 1 }, 40), 'Soft dark glass, 1px border, subtle top gradient.'),
  movies: spec('movies', 'Movies', { bg: '#0B0B0F', surface: '#14141B', surface2: '#1C1C26', ink: '#F2EDE4', inkMuted: '#8A8577', accent: '#D4AF37', accent2: '#8B1E2D', border: '#2A2A33' }, { display: "'Bebas Neue', sans-serif", body: "'Inter Variable', sans-serif" }, 6, motion(200, 360, 700, [0.22, 1, 0.36, 1], { stiffness: 170, damping: 26, mass: 1 }, 40), 'Cinematic poster, vignette, gold hairline.'),
  series: spec('series', 'Series', { bg: '#0f1d1f', surface: '#1b3336', surface2: '#244448', ink: '#f3ead8', inkMuted: '#a9b8b5', accent: '#f4b860', accent2: '#e4572e', border: '#3d5552' }, { display: "'Special Elite', cursive", body: "'Nunito Variable', sans-serif" }, 18, motion(220, 350, 550, [0.25, 0.8, 0.25, 1], { stiffness: 140, damping: 18, mass: 1 }, 50), 'Retro CRT, walnut cabinet, phosphor amber.'),
  anime: spec('anime', 'Anime', { bg: '#FFF4D6', surface: '#FFFFFF', surface2: '#FFE9A8', ink: '#1B1B3A', inkMuted: '#5B5B80', accent: '#FF4D8D', accent2: '#22D3EE', border: '#1B1B3A' }, { display: "'Bowlby One', sans-serif", body: "'Poppins', sans-serif" }, 14, motion(160, 250, 400, [0.34, 1.56, 0.64, 1], { stiffness: 400, damping: 17, mass: 1 }, 35), 'Hard offset shadow, sticker status, halftone.'),
  games: spec('games', 'Games', { bg: '#07060F', surface: '#100E21', surface2: '#1A1736', ink: '#E8E6FF', inkMuted: '#8B86B8', accent: '#00F0FF', accent2: '#FF2BD6', border: '#2B2760' }, { display: "'Orbitron Variable', sans-serif", body: "'Rajdhani', sans-serif" }, 4, motion(120, 180, 320, [0.2, 0.8, 0.2, 1], { stiffness: 300, damping: 30, mass: 1 }, 25), 'Neon border, glow, scanlines, chamfer.'),
  books: spec('books', 'Books', { bg: '#F4EBDD', surface: '#FBF6EC', surface2: '#EFE3CF', ink: '#2E2A25', inkMuted: '#7A6F62', accent: '#8C5A3C', accent2: '#7A8B69', border: '#D9C9AE' }, { display: "'Lora Variable', serif", body: "'Source Serif 4 Variable', serif" }, 4, motion(260, 500, 800, [0.45, 0, 0.2, 1], { stiffness: 90, damping: 20, mass: 1 }, 60), 'Paper cover, spine shadow, no bounce.'),
  other: spec('other', 'Other', { bg: '#111418', surface: '#1A1F26', surface2: '#232A33', ink: '#E6EAF0', inkMuted: '#8B95A5', accent: '#5EEAD4', accent2: '#A78BFA', border: '#2B333E' }, inter, 10, motion(150, 240, 400, [0.2, 0, 0, 1], { stiffness: 200, damping: 24, mass: 1 }, 30), 'Simple dark list.'),
}
