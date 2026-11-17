import { TAB_NAME, type ListId } from '@/types/lists'

export function ListHeader({ listId, poster, enriching }: { listId: ListId; poster?: string | null; enriching?: string }) {
  return (
    <header className="relative overflow-hidden">
      {listId === 'movies' ? <div aria-hidden="true" className="marquee-bulbs h-4" /> : null}
      {listId === 'series' && poster !== undefined && poster !== null ? <img alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-md" src={poster} /> : null}
      {listId === 'anime' ? <div className="halftone h-8" /> : null}
      {listId === 'games' ? <div className="scanlines h-2" /> : null}
      <div className={`relative space-y-2 p-4 ${listId === 'books' ? 'paper' : ''}`}>
        <h2 className={`font-(--font-display) text-4xl ${listId === 'movies' || listId === 'games' ? 'uppercase tracking-[0.06em]' : ''}`}>{TAB_NAME[listId]}</h2>
        {listId === 'series' ? <p className="font-['VT323',monospace] text-2xl text-accent">CH 01</p> : null}
        {listId === 'games' ? <div className="h-0.5 w-24 bg-accent" /> : null}
        {enriching !== undefined ? <span className="rounded-full border px-2 py-0.5 text-sm">{enriching}</span> : null}
      </div>
    </header>
  )
}
