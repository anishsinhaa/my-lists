import { useState } from 'react'
import { motion } from 'motion/react'
import { fadeUp } from '@/themes/motion'
import { useNavigate } from 'react-router-dom'
import { itemHref } from '@/features/home/tonight'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useSaveItem } from '@/features/lists/useSaveItem'
import { ItemModal } from '@/features/lists/views/ItemModal'
import type { MediaItem } from '@/types/media'
import { SearchResultRow } from '@/features/home/SearchResultRow'
import { themeForList } from './searchControls'
import type { SearchHit } from './searchIndex'

export function SearchResults({ hits, active, idPrefix = 'search-hit' }: { hits: SearchHit[]; active: number; idPrefix?: string }) {
  const navigate = useNavigate()
  const canEdit = useCanEdit()
  const save = useSaveItem()
  const [openId, setOpenId] = useState<string | null>(null)
  const media = hits.flatMap((hit) => hit.source.kind === 'item' ? [hit.source.item] : [])
  const open = openId === null ? null : media.find((item) => item.id === openId) ?? null

  function choose(hit: SearchHit) {
    if (hit.source.kind === 'pick') {
      navigate(`/picks?tab=${hit.source.item.picksId}&q=${encodeURIComponent(hit.source.item.title)}`)
      return
    }
    setOpenId(hit.source.item.id)
  }

  function openInList(item: MediaItem) {
    setOpenId(null)
    void navigate(itemHref(item))
  }

  return (
    <>
      <ul className="mt-3 space-y-1" role="listbox">
        {hits.map((hit, index) => (
          <motion.li key={`${hit.source.kind}-${hit.id}`} {...fadeUp} transition={{ delay: Math.min(index, 12) * 0.04 }}>
            <SearchResultRow active={index === active} controlId={`${idPrefix}-${index}`} hit={hit} onSelect={() => choose(hit)} />
          </motion.li>
        ))}
      </ul>
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
