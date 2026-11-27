import type { ReactNode } from 'react'

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {body !== undefined ? <p className="mt-1 text-sm text-muted-foreground">{body}</p> : null}
      {action !== undefined ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
