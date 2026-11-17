import { useState } from 'react'
import { BRAND, copyrightLine } from '@/config/branding'
import { CreditsSheet } from '@/design/CreditsSheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function ArchiveFooter() {
  const [open, setOpen] = useState(false)
  const mobile = useMediaQuery('(max-width: 767px)')
  return (
    <>
      <footer className={`fixed inset-x-0 z-30 border-t border-(--brass)/40 bg-[#100e0c]/95 px-3 text-[#e8dcc4] ${mobile ? 'bottom-14 h-6 text-[11px]' : 'bottom-0 h-10 text-xs'}`}>
        {mobile ? (
          <button type="button" className="flex h-full w-full items-center justify-center" onClick={() => setOpen(true)}>© · Credits</button>
        ) : (
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3">
            <p>{copyrightLine()}</p>
            <p className="flex flex-wrap items-center gap-x-3">
              <a href={BRAND.tmdb} target="_blank" rel="noopener noreferrer">TMDB</a>
              <a href={BRAND.omdb} target="_blank" rel="noopener noreferrer">OMDb</a>
              <a href={BRAND.rawg} target="_blank" rel="noopener noreferrer">Game data from RAWG</a>
              <a href={BRAND.openLibrary} target="_blank" rel="noopener noreferrer">Open Library</a>
              <button type="button" className="underline" onClick={() => setOpen(true)}>Credits</button>
            </p>
          </div>
        )}
      </footer>
      <CreditsSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
