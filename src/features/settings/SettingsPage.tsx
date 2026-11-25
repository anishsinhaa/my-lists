import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useLists } from '@/features/data/useLists'
import { dataHealth } from '@/features/lists/stats/dataHealth'
import { fetchLists } from '@/services/sheets/listsApi'
import { listsCache } from '@/services/sheets/listsCache'
import { LIST_IDS, POSTER_LISTS, TAB_NAME, type ListId } from '@/types/lists'
import type { PicksToggles } from '@/types/settings'
import { savePicks, startEnrich, useEnrichStatus, useSettings } from './useSettings'

type RefreshTab = 'all' | ListId

function SwitchRow({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full disabled:opacity-50 ${checked ? 'bg-accent' : 'bg-(--ink-muted)'}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const settings = useSettings()
  const status = useEnrichStatus()
  const lists = useLists()
  const canEdit = useCanEdit()
  const [tab, setTab] = useState<RefreshTab>('all')
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const wasRunning = useRef(false)
  const running = status.data?.running === true
  const picks = settings.data?.picks
  const hardOff = settings.data?.hardOff === true

  useEffect(() => {
    if (wasRunning.current && !running) {
      listsCache.clear()
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      void fetchLists({ refresh: true }).then((data) => {
        queryClient.setQueryData(['lists'], data)
        listsCache.save(data)
      })
    }
    wasRunning.current = running
  }, [queryClient, running])

  async function updatePicks(next: PicksToggles): Promise<void> {
    if (!canEdit) return
    setSaving(true)
    setNotice(null)
    try {
      const saved = await savePicks(next)
      queryClient.setQueryData(['settings'], saved)
      listsCache.clear()
      const data = await fetchLists({ refresh: true })
      queryClient.setQueryData(['lists'], data)
      listsCache.save(data)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  async function run(force: boolean): Promise<void> {
    if (!canEdit) return
    if (force) {
      if (tab === 'all') return
      const confirmed = window.confirm(`Overwrite Poster and IMDb Rating on ${TAB_NAME[tab]}? A cell stays as it is when the lookup returns nothing.`)
      if (!confirmed) return
    }
    setNotice(null)
    try {
      const started = await startEnrich({ tab, force })
      queryClient.setQueryData(['enrich-status'], started)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start the refresh')
    }
  }

  async function fill(id: ListId): Promise<void> {
    if (!canEdit) return
    setNotice(null)
    try {
      const started = await startEnrich({ tab: id, force: false })
      queryClient.setQueryData(['enrich-status'], started)
      setTab(id)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start the refresh')
    }
  }

  async function reloadFromSheet(): Promise<void> {
    listsCache.clear()
    const data = await fetchLists({ refresh: true })
    queryClient.setQueryData(['lists'], data)
    listsCache.save(data)
    setNotice('Reloaded from the sheet.')
  }

  const lines = status.data?.lines ?? []
  const lastRun = settings.data?.lastRun ?? status.data?.lastRun ?? null

  return (
    <main className="edge flex w-full max-w-3xl flex-col gap-8 py-4">
      <section className="space-y-3">
        <h2 className="font-(--font-display) text-xl">Refresh data</h2>
        <label className="flex flex-col gap-1 text-sm">
          Tab
          <select
            aria-label="Tab to refresh"
            className="min-h-11 rounded-md border bg-(--surface) px-3"
            value={tab}
            disabled={running}
            onChange={(event) => setTab(event.target.value as RefreshTab)}
          >
            <option value="all">All tabs</option>
            {POSTER_LISTS.map((id) => <option key={id} value={id}>{TAB_NAME[id]}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-11" disabled={!canEdit || running} onClick={() => void run(false)}>Fill missing posters & ratings</Button>
          <Button type="button" className="min-h-11" variant="outline" disabled={!canEdit || running || tab === 'all'} onClick={() => void run(true)}>Force refetch</Button>
          <Button type="button" className="min-h-11" variant="outline" onClick={() => void reloadFromSheet()}>Reload from sheet</Button>
        </div>
        {running && status.data !== undefined ? (
          <p>
            {status.data.tab === null ? 'Starting the refresh.' : `${TAB_NAME[status.data.tab]}: ${status.data.done}/${status.data.total}.`} Failed {status.data.failed}.
          </p>
        ) : null}
        {!running && lines.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {lines.map((line) => (
              <li key={line.tab}>
                {TAB_NAME[line.tab]}: posters {line.posterFilled} filled, {line.posterMissing} missing. Ratings {line.imdbFilled} filled, {line.imdbMissing} missing.
                {line.failures.length > 0 ? ` Failed ${line.failures.length}: ${line.failures.slice(0, 5).join('; ')}` : ''}
              </li>
            ))}
          </ul>
        ) : null}
        {status.data?.error !== null && status.data?.error !== undefined ? <p>{status.data.error}</p> : null}
        <p className="text-sm text-(--ink-muted)">
          {lastRun === null ? 'No refresh has been run from Settings yet.' : `Last run ${new Date(lastRun.finishedAt).toLocaleString()}: ${lastRun.summary}`}
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-(--font-display) text-xl">Data health</h2>
        {lists.data === undefined ? <p className="text-sm text-(--ink-muted)">Loading lists.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {LIST_IDS.map((id) => {
              const health = dataHealth(lists.data?.lists[id] ?? [])
              return (
                <article key={id} className="space-y-2 rounded-md border border-(--brass)/40 bg-(--surface) p-3">
                  <h3 className="font-(--font-display) text-lg">{TAB_NAME[id]}</h3>
                  <ul className="space-y-1 text-sm text-(--ink-muted)">
                    <li>Missing posters {health.posters}</li>
                    <li>Missing ratings {health.ratings}</li>
                    <li>Missing creators {health.creators}</li>
                    <li>Missing franchises {health.franchises}</li>
                  </ul>
                  {POSTER_LISTS.includes(id) ? <Button type="button" className="min-h-11" disabled={!canEdit || running} onClick={() => void fill(id)}>Fill missing data</Button> : null}
                </article>
              )
            })}
          </div>
        )}
      </section>
      <section className="space-y-1">
        <h2 className="font-(--font-display) text-xl">Picks tabs</h2>
        {hardOff ? <p className="text-sm">FEATURE_PICKS is off, so picks stay hidden.</p> : null}
        {settings.isLoading || picks === undefined ? <p>Loading settings.</p> : (
          <>
            <SwitchRow label="Picks" checked={picks.enabled} disabled={!canEdit || hardOff || saving} onChange={(enabled) => void updatePicks({ ...picks, enabled })} />
            <SwitchRow label="Movies picks" checked={picks.movies} disabled={!canEdit || hardOff || saving} onChange={(movies) => void updatePicks({ ...picks, movies })} />
            <SwitchRow label="Series picks" checked={picks.series} disabled={!canEdit || hardOff || saving} onChange={(series) => void updatePicks({ ...picks, series })} />
            <SwitchRow label="Games picks" checked={picks.games} disabled={!canEdit || hardOff || saving} onChange={(games) => void updatePicks({ ...picks, games })} />
          </>
        )}
      </section>
      {notice !== null ? <p>{notice}</p> : null}
    </main>
  )
}
