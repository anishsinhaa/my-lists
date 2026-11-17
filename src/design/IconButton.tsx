import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={label} className={`inline-flex size-11 items-center justify-center rounded-md border border-(--brass)/40 bg-(--surface) text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brass) disabled:opacity-50 ${className}`} {...props}>
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
