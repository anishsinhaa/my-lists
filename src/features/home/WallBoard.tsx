import { Link } from 'react-router-dom'
import { Rail } from '@/design/Rail'
import { HomePosterLink } from './HomePosterLink'
import type { WallTile } from './wall'

export function WallBoard({ tiles }: { tiles: WallTile[] }) {
  return (
    <>
      <section className="edge grid w-full gap-4 py-4 md:grid-cols-12">
        {tiles.map((tile) => (
          <article key={tile.id} className="rounded-md border border-(--brass)/40 bg-[#17130f]/80 p-3 md:col-span-4">
            <Link className="block min-h-11" to={tile.href}>
              <span className="font-['Cinzel',serif] text-sm tracking-wide">{tile.title}</span>
              <span className="mt-1 block text-xs text-(--ink-muted)">{tile.items.length}</span>
            </Link>
            <span className="mt-3 flex gap-2 overflow-hidden">
              {tile.items.slice(0, 4).map((item) => <HomePosterLink key={item.id} className="w-14 shrink-0" item={item} />)}
            </span>
          </article>
        ))}
      </section>
      <div className="md:hidden">
        {tiles.map((tile) => (
          <section key={`${tile.id}-rail`} className="edge pb-4">
            <h2 className="mb-2 font-['Cinzel',serif] text-sm"><Link to={tile.href}>{tile.title}</Link></h2>
            <Rail label={tile.title}>
              {tile.items.slice(0, 8).map((item) => (
                <HomePosterLink key={item.id} className="w-[clamp(4.5rem,18cqi,7.5rem)] shrink-0 snap-start" item={item} />
              ))}
            </Rail>
          </section>
        ))}
      </div>
    </>
  )
}
