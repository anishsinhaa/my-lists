import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { PosterImage } from '@/components/common/PosterImage'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/design/StatusBadge'
import { StatusGlyph } from '@/design/icons'
import { STATUS_TABLE } from '@/design/statusConfig'
import { thumbnailUrl } from '@/design/archive'
import { displayTitle } from '@/lib/displayTitle'
import { externalRatingLabel } from '@/lib/rating'
import { LIST_KIND, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { ItemPatch } from '../useSaveItem'

function shown(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (text.length === 0 || text === '-' || text === '–' || text === '—') return null
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10)
  return text
}

function creatorLabel(listId: ListId): string {
  if (listId === 'books') return 'Author'
  if (listId === 'movies') return 'Director'
  return 'Creator'
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const text = shown(value)
  if (text === null) return null
  return <p className="text-sm"><span className="text-(--ink-muted)">{label}: </span>{text}</p>
}

export function ItemModal({ item, items, listId, onClose, onOpen, onSave }: {
  item: MediaItem | null
  items: MediaItem[]
  listId: ListId
  onClose: () => void
  onOpen: (item: MediaItem) => void
  onSave: (item: MediaItem, patch: ItemPatch) => Promise<void>
}) {
  const [draft, setDraft] = useState<{ id: string; text: string; editing: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const note = draft !== null && draft.id === item?.id ? draft.text : (item?.why ?? '')
  const editingNote = draft !== null && draft.id === item?.id && draft.editing
  const index = item === null ? -1 : items.findIndex((entry) => entry.id === item.id)
  const previous = index > 0 ? items[index - 1] : undefined
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : undefined

  useEffect(() => {
    if (item === null) return undefined
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return
      if (event.key === 'ArrowLeft' && previous !== undefined) onOpen(previous)
      if (event.key === 'ArrowRight' && next !== undefined) onOpen(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, next, onOpen, previous])

  async function save(patch: ItemPatch) {
    if (item === null || busy) return
    setBusy(true)
    try {
      await onSave(item, patch)
    } catch {
      setDraft(null)
    } finally {
      setBusy(false)
    }
  }

  const finished = shown(item?.extra['date finished'])
  const external = item === null ? null : shown(item.imdbRating)
  const label = externalRatingLabel(listId)

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="item-modal gap-0 border-(--border) bg-(--bg) p-0 text-(--ink)">
        {item === null ? <DialogTitle className="sr-only">Item</DialogTitle> : (
          <div className="flex min-h-0 flex-col md:grid md:max-h-[min(92dvh,900px)] md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
            <div className="bg-(--surface) p-4">
              <PosterImage alt="" className="mx-auto w-full max-w-56 md:max-w-none" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w500')} title={displayTitle(item.title, item.year)} priority />
            </div>
            <div className="min-h-0 space-y-4 overflow-y-auto p-4 pr-12 md:p-6 md:pr-12">
              <div className="flex items-start gap-2">
                <button type="button" aria-label="Previous" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-(--border) disabled:opacity-30" disabled={previous === undefined || busy} onClick={() => { if (previous !== undefined) onOpen(previous) }}>
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-(--font-display) text-2xl leading-tight">{displayTitle(item.title, item.year)}</DialogTitle>
                  <DialogDescription className="sr-only">{displayTitle(item.title, item.year)}</DialogDescription>
                </div>
                <button type="button" aria-label="Next" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-(--border) disabled:opacity-30" disabled={next === undefined || busy} onClick={() => { if (next !== undefined) onOpen(next) }}>
                  <ChevronRight aria-hidden="true" className="size-5" />
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-xs tracking-wide text-(--ink-muted)">Why it's on my list</p>
                {editingNote ? (
                  <textarea aria-label="Why it's on my list" className="min-h-24 w-full rounded-md border border-(--border) bg-(--surface) p-2 text-base" value={note} onChange={(event) => setDraft({ id: item.id, text: event.target.value, editing: true })} onBlur={() => { setDraft((current) => current === null ? null : { ...current, editing: false }); if (note !== item.why) void save({ status: item.status, myRating: item.myRating, why: note }) }} />
                ) : shown(item.why) === null ? (
                  <button type="button" className="text-sm text-(--ink-muted) italic" onClick={() => setDraft({ id: item.id, text: item.why, editing: true })}>Add a note</button>
                ) : (
                  <button type="button" className="text-left text-base" onClick={() => setDraft({ id: item.id, text: item.why, editing: true })}>{item.why}</button>
                )}
              </div>
              <Field label="Year" value={item.year} />
              {item.genres.length === 0 ? null : (
                <div className="flex flex-wrap gap-1.5">
                  {item.genres.map((genre) => <span key={genre} className="rounded-full border border-(--border) px-2 py-0.5 text-xs">{genre}</span>)}
                </div>
              )}
              <Field label={creatorLabel(listId)} value={item.creator} />
              <Field label="Franchise" value={item.franchise} />
              {listId === 'games' ? <Field label="Platform" value={item.platform} /> : null}
              {shown(item.status) === null ? null : <StatusBadge listId={listId} status={item.status} />}
              {shown(item.myRating) === null ? null : <p className="text-sm"><span className="text-(--ink-muted)">My Rating: </span>{item.myRating}</p>}
              {external === null ? null : <p className="text-sm"><span className="text-(--ink-muted)">{label}: </span>{external}</p>}
              {finished === null ? null : <p className="text-sm"><span className="text-(--ink-muted)">Date finished: </span>{finished}</p>}
              {STATUS_TABLE[listId].length === 0 ? null : (
                <div className="space-y-2">
                  <p className="text-xs tracking-wide text-(--ink-muted)">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_TABLE[listId].map((entry) => (
                      <button key={entry.value} type="button" aria-pressed={item.status.trim().toLowerCase() === entry.value.toLowerCase()} disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--border) px-3 text-sm aria-pressed:bg-(--accent) aria-pressed:text-(--bg)" onClick={() => { if (item.status.trim().toLowerCase() !== entry.value.toLowerCase()) void save({ status: entry.value, myRating: item.myRating }) }}>
                        <StatusGlyph name={entry.icon} />
                        {entry.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs tracking-wide text-(--ink-muted)">My Rating</p>
                <div className="grid w-full max-w-md grid-cols-10">
                  {Array.from({ length: 10 }, (_, star) => {
                    const value = star + 1
                    const filled = item.myRating !== null && value <= item.myRating
                    return (
                      <button key={value} type="button" aria-label={`Rate ${value}`} aria-pressed={item.myRating === value} disabled={busy} className="inline-flex h-11 items-center justify-center" onClick={() => void save({ status: item.status, myRating: item.myRating === value ? null : value })}>
                        <Star aria-hidden="true" className={`size-5 ${filled ? 'fill-(--accent) text-(--accent)' : 'text-(--ink-muted)'}`} />
                      </button>
                    )
                  })}
                </div>
                <button type="button" className="min-h-11 px-2 text-sm text-(--ink-muted)" disabled={busy || item.myRating === null} onClick={() => void save({ status: item.status, myRating: null })}>Clear</button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
