import type { ReactNode } from 'react'

const SIGNS = ['movies', 'series', 'anime', 'games', 'books'] as const
export type SignListId = (typeof SIGNS)[number]

export function ListSign({ listId, children }: { listId: SignListId; children: ReactNode }) {
  return (
    <span className={`list-sign list-sign-${listId}`}>
      {listId === 'series' ? <span className="list-sign-led" aria-hidden="true">CH 01</span> : null}
      {listId === 'games' ? <span className="list-sign-brackets" aria-hidden="true" /> : null}
      {listId === 'books' ? <span className="list-sign-foil" aria-hidden="true" /> : null}
      <span className="list-sign-label">{children}</span>
    </span>
  )
}
