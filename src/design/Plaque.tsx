import type { ReactNode } from 'react'

export function Plaque({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative border border-(--brass)/70 bg-[linear-gradient(180deg,#2a241c,#14110e)] px-4 py-3 text-center text-(--ink) shadow-[inset_0_1px_0_#ffffff22] ${className}`}>
      <span aria-hidden="true" className="absolute top-1.5 left-1.5 size-1.5 rounded-full bg-(--brass)" />
      <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-(--brass)" />
      <span aria-hidden="true" className="absolute bottom-1.5 left-1.5 size-1.5 rounded-full bg-(--brass)" />
      <span aria-hidden="true" className="absolute right-1.5 bottom-1.5 size-1.5 rounded-full bg-(--brass)" />
      <div className="font-['Cormorant_SC',serif] text-2xl tracking-wide" style={{ textShadow: '0 1px 0 #000, 0 -1px 0 #ffffff33' }}>{children}</div>
    </div>
  )
}
