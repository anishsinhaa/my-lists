import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BRAND, copyrightLine } from '@/config/branding'

const LINKS = [
  { href: BRAND.tmdb, label: 'TMDB', note: 'Posters and movie/TV data. This product uses the TMDB API but is not endorsed or certified by TMDB.' },
  { href: BRAND.omdb, label: 'OMDb', note: 'IMDb ratings.' },
  { href: BRAND.rawg, label: 'RAWG', note: 'Game data from RAWG.' },
  { href: BRAND.openLibrary, label: 'Open Library', note: 'Book covers and ratings.' },
]

export function CreditsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto bg-[#14110e] text-[#f3e6c8]">
        <SheetHeader>
          <SheetTitle>Credits</SheetTitle>
        </SheetHeader>
        <p className="px-4 text-sm">{copyrightLine()}</p>
        <ul className="space-y-3 px-4 py-4 text-sm">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a className="underline" href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
              <span className="mt-1 block text-[#c9b89a]">{link.note}</span>
            </li>
          ))}
          <li>Fonts: Fraunces, Cormorant SC, Cinzel, EB Garamond, IM Fell English, Bebas Neue, Special Elite, VT323, Bangers, Inter, Nunito, Poppins, Rajdhani, Lora, Source Serif 4, Orbitron, Bowlby One. All SIL Open Font License.</li>
          <li>Icons: Lucide, ISC licence.</li>
          <li>Grain is generated in CSS. No downloaded textures yet.</li>
        </ul>
      </SheetContent>
    </Sheet>
  )
}
