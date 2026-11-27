import { useState } from 'react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { fadeUp } from '@/themes/motion'
import { itemHref } from '@/features/home/tonight'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useSaveItem } from '@/features/lists/useSaveItem'
import { ItemModal } from '@/features/lists/views/ItemModal'
import type { MediaItem } from '@/types/media'
import { TAB_NAME, type ListId } from '@/types/lists'
import { SearchResultRow } from '@/features/home/SearchResultRow'
import { themeForList } from './searchControls'
import { groupHits, type SearchHit } from './searchIndex'

const PER_GROUP = 8

export function SearchResults({ hits, active, idPrefix = 'search-hit', grouped = false, query = '', expanded, onShowAll }: {
  hits: SearchHit[]
  active: number
  idPrefix?: string
  grouped?: boolean
  query?: string
  expanded?: ReadonlySet<string>
  onShowAll?: (listId: ListId) => void
}) {
  const navigate = useNavigate()
  const canEdit = useCanEdit()
  const save = useSaveItem()
  const [openId, setOpenId] = useState<string | null>(null)
  const media = hits.flatMap((hit) => hit.source.kind === 'item' ? [hit.source.item] : [])
  const open = openId === null ? null : media.find((item) => item.id === openId) ?? null

  function choose(hit: SearchHit) {
    if (hit.source.kind === 'pick') {
      if (!canEdit) return
      navigate(`/picks?tab=${hit.source.item.picksId}&q=${encodeURIComponent(hit.source.item.title)}`)
      return
    }
    setOpenId(hit.source.item.id)
  }

  function openInList(item: MediaItem) {
    setOpenId(null)
    void navigate(itemHref(item))
  }

  const rows = grouped ? groupedRows(hits, expanded ?? new Set(), query, active, idPrefix, choose, onShowAll) : flatRows(hits, active, idPrefix, choose)

  return (
    <>
      {rows}
      <ItemModal
        item={open}
        items={media}
        listId={open?.listId ?? 'movies'}
        theme={open === null ? undefined : themeForList(open.listId)}
        onClose={() => setOpenId(null)}
        onOpen={(entry) => setOpenId(entry.id)}
        onOpenInList={open === null ? undefined : () => openInList(open)}
        readOnly={!canEdit}
        onSave={save}
      />
    </>
  )
}

function flatRows(hits: SearchHit[], active: number, idPrefix: string, choose: (hit: SearchHit) => void) {
  return (
    <ul className="mt-3 space-y-1" role="listbox">
      {hits.map((hit, index) => (
        <motion.li key={`${hit.source.kind}-${hit.id}`} {...fadeUp} transition={{ delay: Math.min(index, 12) * 0.04 }}>
          <SearchResultRow active={index === active} controlId={`${idPrefix}-${index}`} hit={hit} onSelect={() => choose(hit)} />
        </motion.li>
      ))}
    </ul>
  )
}

function groupedRows(
  hits: SearchHit[],
  expanded: ReadonlySet<string>,
  query: string,
  active: number,
  idPrefix: string,
  choose: (hit: SearchHit) => void,
  onShowAll?: (listId: ListId) => void,
) {
  const groups = groupHits(hits)
  let index = 0
  return (
    <div className="mt-4 space-y-6">
      {groups.map((group) => {
        const shown = expanded.has(group.listId) || group.hits.length <= PER_GROUP ? group.hits : group.hits.slice(0, PER_GROUP)
        const section = shown.map((hit) => {
          const rowIndex = index
          index += 1
          return (
            <motion.li key={`${hit.source.kind}-${hit.id}`} {...fadeUp} transition={{ delay: Math.min(rowIndex, 12) * 0.04 }}>
              <SearchResultRow active={rowIndex === active} controlId={`${idPrefix}-${rowIndex}`} hit={hit} onSelect={() => choose(hit)} />
            </motion.li>
          )
        })
        return (
          <section key={group.listId}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-(--font-display) text-xl">{TAB_NAME[group.listId]} · {group.hits.length}</h2>
              <Link className="min-h-11 text-sm" to={`/lists/${group.listId}?q=${encodeURIComponent(query)}`}>Open in {TAB_NAME[group.listId]}</Link>
            </div>
            <ul className="space-y-1" role="listbox">{section}</ul>
            {shown.length < group.hits.length ? (
              <button type="button" className="mt-2 min-h-11 text-sm" onClick={() => onShowAll?.(group.listId)}>Show all {group.hits.length}</button>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
