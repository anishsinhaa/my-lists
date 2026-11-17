import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from 'cn'

type Variant = 'brass' | 'ghost' | 'icon'
type Size = 'md' | 'lg'

export function Button({ variant = 'brass', size = 'md', className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; children?: ReactNode }) {
  const sizing = size === 'lg' ? 'min-h-[52px] px-5 text-base' : 'min-h-11 px-4 text-sm'
  const look = variant === 'ghost'
    ? 'border border-(--brass)/50 bg-transparent text-(--ink)'
    : variant === 'icon'
      ? 'size-11 min-h-11 min-w-11 px-0'
      : 'border border-[#8c6b3a] bg-[linear-gradient(180deg,#d7b56a,#8d6840)] text-[#1a1208] shadow-[inset_0_1px_0_#f3e2b5,0_2px_0_#5c4324]'
  return (
    <button type="button" className={cn('inline-flex items-center justify-center gap-2 rounded-md font-medium transition active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brass) disabled:opacity-50', sizing, look, className)} {...props}>
      {children}
    </button>
  )
}
