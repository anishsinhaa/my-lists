import { PosterImage } from '@/components/common/PosterImage'
import { displayTitle } from '@/lib/displayTitle'
import { LIST_KIND } from '@/types/lists'
import type { PickItem } from '@/types/media'

export function PickCard({ item, existing }: { item: PickItem; existing?: string }) {
  return (
    <article className="rounded-2xl border bg-(--surface) p-4 shadow-(--shadow-card)">
      <PosterImage alt="" byline={item.year === null ? '' : String(item.year)} className="mx-auto w-[clamp(7rem,46%,11rem)]" kind={LIST_KIND[item.targetList]} src={item.poster} title={displayTitle(item.title, item.year)} />
      <h2 className="mt-3 text-xl">{displayTitle(item.title, item.year)}</h2>
      <p className="text-sm text-(--ink-muted)">{item.year ?? '–'} {item.genres.join(', ')}</p>
      <p className="mt-2 text-sm">Because you liked {item.becauseYouLiked}</p>
      {item.why.length > 0 ? <p className="text-sm text-(--ink-muted)">{item.why}</p> : null}
      {existing !== undefined && existing.length > 0 ? <p className="mt-2 text-sm">Already in your list: {existing}</p> : null}
    </article>
  )
}
