import { useState, type KeyboardEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { formatRating } from '@/lib/rating'
import type { ThemeId } from '@/types/theme'
import { StarRating } from './StarRating'

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10))
}

function parseDraft(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (normalized.length === 0) return null
  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return clampRating(value)
}

export function RateDialog({ open, value, theme, onCancel, onSave }: {
  open: boolean
  value: number | null
  theme?: ThemeId
  onCancel: () => void
  onSave: (next: number | null) => void
}) {
  const [draft, setDraft] = useState<number | null>(value)
  const [text, setText] = useState(value === null ? '' : formatRating(value))
  const [forValue, setForValue] = useState(value)
  if (value !== forValue) {
    setForValue(value)
    setDraft(value)
    setText(value === null ? '' : formatRating(value))
  }

  function setRating(next: number | null) {
    setDraft(next)
    setText(next === null ? '' : formatRating(next))
  }

  function nudge(delta: number) {
    setRating(clampRating((draft ?? 0) + delta))
  }

  function hold(delta: number) {
    nudge(delta)
    const timer = window.setInterval(() => {
      setDraft((current) => {
        const next = clampRating((current ?? 0) + delta)
        setText(formatRating(next))
        return next
      })
    }, 120)
    const stop = () => {
      window.clearInterval(timer)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  function commitValue(): number | null {
    if (text.trim().length === 0) return null
    return parseDraft(text)
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSave(commitValue())
      return
    }
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    if (typing) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      nudge(event.shiftKey ? 1 : 0.1)
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      nudge(event.shiftKey ? -1 : -0.1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent theme={theme} className="border-(--border) bg-(--bg) text-(--ink)" onKeyDownCapture={onKey}>
        <DialogTitle className="font-(--font-display) text-xl">Rate</DialogTitle>
        <DialogDescription className="sr-only">Choose a rating from 0 to 10</DialogDescription>
        <p className="font-(--font-display) text-5xl tabular-nums">
          {draft === null ? '—' : formatRating(draft)}
          <span className="ml-2 text-base text-(--ink-muted)">/ 10</span>
        </p>
        <Slider max={10} min={0} step={0.1} value={[draft ?? 0]} onValueChange={(next) => {
          const picked = next[0]
          if (picked === undefined) return
          setRating(clampRating(picked))
        }} />
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Decrease rating" className="inline-flex size-11 items-center justify-center rounded-md border border-(--border)" onPointerDown={() => hold(-0.1)}><Minus aria-hidden="true" className="size-4" /></button>
          <button type="button" aria-label="Increase rating" className="inline-flex size-11 items-center justify-center rounded-md border border-(--border)" onPointerDown={() => hold(0.1)}><Plus aria-hidden="true" className="size-4" /></button>
          <input
            aria-label="Rating"
            className="h-11 min-w-0 flex-1 rounded-md border border-(--border) bg-(--surface) px-3"
            inputMode="decimal"
            value={text}
            onBlur={() => {
              if (text.trim().length === 0) {
                setRating(null)
                return
              }
              const parsed = parseDraft(text)
              setRating(parsed)
            }}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <StarRating readOnly value={draft} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="min-h-11 px-3 text-sm" onClick={() => onSave(null)}>Clear rating</button>
          <button type="button" className="min-h-11 px-3 text-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="min-h-11 rounded-md bg-(--accent) px-4 text-sm text-(--bg)" onClick={() => onSave(commitValue())}>Save</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
