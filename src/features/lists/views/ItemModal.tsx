import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { PosterImage } from '@/components/common/PosterImage'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/design/StatusBadge'
import { StatusGlyph } from '@/design/icons'
import { STATUS_TABLE } from '@/design/statusConfig'
import { thumbnailUrl } from '@/design/archive'
import { displayTitle } from '@/lib/displayTitle'
import { externalRatingLabel } from '@/lib/rating'
import type { ThemeId } from '@/types/theme'
import { LIST_KIND, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { ItemPatch } from '../useSaveItem'
import { StarRating } from './StarRating'

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

function DetailGrid({ rows }: { rows: Array<{ label: string; value: string | number | null | undefined }> }) {
  const visible = rows.flatMap((row) => {
    const text = shown(row.value)
    return text === null ? [] : [{ label: row.label, text }]
  })
  if (visible.length === 0) return null
  return (
    <dl className="grid grid-cols-1 gap-y-1 text-sm min-[480px]:grid-cols-[max-content_minmax(0,1fr)] min-[480px]:gap-x-3">
      {visible.map((row) => (
        <Fragment key={row.label}>
          <dt className="text-(--ink-muted)">{row.label}</dt>
          <dd className="min-w-0 wrap-break-word">{row.text}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

function TextBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs tracking-wide text-(--ink-muted)">{label}</p>
      <div className="text-sm leading-snug">{children}</div>
    </div>
  )
}

function NotesEditor({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const skipBlur = useRef(false)
  const empty = value.trim().length === 0

  function commit(next: string) {
    if (skipBlur.current) return
    skipBlur.current = true
    setEditing(false)
    if (next !== value) onSave(next)
  }

  function cancel() {
    skipBlur.current = true
    setDraft(value)
    setEditing(false)
  }

  return (
    <div className="space-y-1">
      <p className="text-xs tracking-wide text-(--ink-muted)">My notes</p>
      {editing ? (
        <div className="space-y-2">
          <textarea
            aria-label="My notes"
            autoFocus
            className="min-h-20 w-full rounded-md border border-(--border) bg-(--surface) p-2 text-base"
            placeholder="Add a note, e.g. on Season 3"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                cancel()
              }
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                commit(draft)
              }
            }}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false
                return
              }
              commit(draft)
            }}
          />
          <button type="button" className="min-h-9 rounded-full bg-(--accent) px-3 text-sm text-(--bg)" onMouseDown={(event) => event.preventDefault()} onClick={() => commit(draft)}>Save</button>
        </div>
      ) : (
        <button type="button" className={`w-full rounded-md px-1 py-1 text-left text-sm ${empty ? 'text-(--ink-muted) italic' : ''}`} onClick={() => { skipBlur.current = false; setDraft(value); setEditing(true) }}>
          {empty ? 'Add a note, e.g. on Season 3' : value}
        </button>
      )}
    </div>
  )
}

function StatusMenu({ listId, status, onPick }: { listId: ListId; status: string; onPick: (next: string) => void }) {
  const [open, setOpen] = useState(false)
  const options = STATUS_TABLE[listId]
  const current = status.trim().toLowerCase()
  return (
    <div className="space-y-2">
      {open && options.length > 0 ? (
        <div aria-label="Status" className="max-h-64 overflow-y-auto rounded-t-2xl border border-(--border) bg-(--surface) p-1 shadow-lg">
          {options.map((entry) => {
            const on = entry.value.toLowerCase() === current
            return (
              <button key={entry.value} type="button" aria-pressed={on} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm aria-pressed:bg-(--accent) aria-pressed:text-(--bg)" onClick={() => { setOpen(false); if (!on) onPick(entry.value) }}>
                <StatusGlyph name={entry.icon} />
                <span className="min-w-0 flex-1">{entry.value}</span>
                {on ? <Check aria-hidden="true" className="size-4" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <StatusBadge listId={listId} size="lg" status={status} />
        {options.length === 0 ? null : (
          <button type="button" aria-expanded={open} className="min-h-11 shrink-0 px-1 text-sm text-(--ink-muted) underline-offset-2 hover:underline" onClick={() => setOpen((value) => !value)}>Change status</button>
        )}
      </div>
    </div>
  )
}

export function ItemModal({ item, items, listId, onClose, onOpen, onSave, onOpenInList, theme, readOnly = false }: {
  item: MediaItem | null
  items: MediaItem[]
  listId: ListId
  onClose: () => void
  onOpen: (item: MediaItem) => void
  onSave: (item: MediaItem, patch: ItemPatch) => Promise<void>
  onOpenInList?: () => void
  theme?: ThemeId
  readOnly?: boolean
}) {
  const [savedId, setSavedId] = useState<string | null>(null)
  const index = item === null ? -1 : items.findIndex((entry) => entry.id === item.id)
  const previous = index > 0 ? items[index - 1] : undefined
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : undefined

  useEffect(() => {
    if (savedId === null) return undefined
    const timer = window.setTimeout(() => setSavedId(null), 1600)
    return () => window.clearTimeout(timer)
  }, [savedId])

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

  function save(patch: ItemPatch) {
    if (item === null || readOnly) return
    const id = item.id
    setSavedId(id)
    void onSave(item, patch).catch(() => setSavedId((current) => current === id ? null : current))
  }

  const finished = shown(item?.extra['date finished'])
  const external = item === null ? null : shown(item.imdbRating)
  const label = externalRatingLabel(listId)

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        theme={theme}
        className="item-modal gap-0 border-(--border) bg-(--bg) p-0 text-(--ink)"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          const target = event.target
          if (!(target instanceof Element) || !target.isConnected) event.preventDefault()
        }}
      >
        {item === null ? <DialogTitle className="sr-only">Item</DialogTitle> : (
          <div className="flex min-h-0 flex-col md:grid md:max-h-[min(92dvh,900px)] md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
            <div className="bg-(--surface) p-4">
              <PosterImage alt="" className="mx-auto w-full max-w-56 md:max-w-none" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w500')} title={displayTitle(item.title, item.year)} priority />
            </div>
            <div className="min-h-0 space-y-3 overflow-y-auto p-4 pr-12 md:p-5 md:pr-12">
              <div className="flex items-start gap-2">
                <button type="button" aria-label="Previous" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-(--border) disabled:opacity-30" disabled={previous === undefined} onClick={() => { if (previous !== undefined) onOpen(previous) }}>
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1">
                    <DialogTitle className="min-w-0 flex-1 font-(--font-display) text-2xl leading-tight">{displayTitle(item.title, item.year)}</DialogTitle>
                    {readOnly ? (
                      item.favourite ? (
                        <span aria-label="Favourite" className="inline-flex size-11 shrink-0 items-center justify-center">
                          <Heart aria-hidden="true" className="size-5 fill-(--accent) text-(--accent)" />
                        </span>
                      ) : null
                    ) : (
                      <button type="button" aria-label="Favourite" aria-pressed={item.favourite} className="inline-flex size-11 shrink-0 items-center justify-center" onClick={() => save({ favourite: !item.favourite })}>
                        <Heart aria-hidden="true" className={`size-5 ${item.favourite ? 'fill-(--accent) text-(--accent)' : 'text-(--ink-muted)'}`} />
                      </button>
                    )}
                  </div>
                  <DialogDescription className="sr-only">{displayTitle(item.title, item.year)}</DialogDescription>
                  {!readOnly && savedId === item.id ? <p aria-live="polite" className="mt-1 inline-flex items-center gap-1 text-sm text-(--accent)"><Check aria-hidden="true" className="size-4" />Saved</p> : null}
                  {onOpenInList ? <button type="button" className="mt-2 min-h-11 text-sm underline" onClick={onOpenInList}>Open in list</button> : null}
                </div>
                <button type="button" aria-label="Next" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-(--border) disabled:opacity-30" disabled={next === undefined} onClick={() => { if (next !== undefined) onOpen(next) }}>
                  <ChevronRight aria-hidden="true" className="size-5" />
                </button>
              </div>
              {shown(item.why) === null ? null : <TextBlock label="About">{item.why}</TextBlock>}
              <DetailGrid rows={[
                { label: 'Year', value: item.year },
                { label: creatorLabel(listId), value: item.creator },
                { label: 'Franchise', value: item.franchise },
                { label: 'Platform', value: listId === 'games' ? item.platform : null },
                { label, value: external },
                { label: 'My rating', value: item.myRating },
                { label: 'Date finished', value: finished },
              ]} />
              {item.genres.length === 0 ? null : (
                <div className="flex flex-wrap gap-1.5">
                  {item.genres.map((genre) => <span key={genre} className="rounded-full border border-(--border) px-2 py-0.5 text-xs">{genre}</span>)}
                </div>
              )}
              {readOnly ? null : <StarRating value={item.myRating} onChange={(myRating) => save({ myRating })} />}
              {readOnly ? (
                item.notes.trim().length === 0 ? null : <TextBlock label="My notes">{item.notes}</TextBlock>
              ) : (
                <NotesEditor key={item.id} value={item.notes} onSave={(notes) => save({ notes })} />
              )}
              {readOnly ? <StatusBadge listId={listId} size="lg" status={item.status} /> : <StatusMenu key={`${item.id}-status`} listId={listId} status={item.status} onPick={(status) => save({ status })} />}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
