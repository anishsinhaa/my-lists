import type { ReactNode } from 'react'

export function Plaque({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative border border-[#b08d57] bg-[linear-gradient(180deg,#3a3126,#16130f)] px-3 py-2 text-center text-[#f6edd8] shadow-[inset_0_1px_0_#ffffff33] ${className}`}>
      <span aria-hidden="true" className="absolute top-1.5 left-1.5 size-1.5 rounded-full bg-[#b08d57]" />
      <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#b08d57]" />
      <span aria-hidden="true" className="absolute bottom-1.5 left-1.5 size-1.5 rounded-full bg-[#b08d57]" />
      <span aria-hidden="true" className="absolute right-1.5 bottom-1.5 size-1.5 rounded-full bg-[#b08d57]" />
      <div className="font-['Cormorant_SC',serif] text-[clamp(1.15rem,5cqi,1.7rem)] leading-none tracking-wide" style={{ textShadow: '0 1px 0 #000, 0 -1px 0 #ffffff40' }}>{children}</div>
    </div>
  )
}
