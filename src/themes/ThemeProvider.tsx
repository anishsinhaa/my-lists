import { createContext, useContext, type ReactNode } from 'react'
import type { ThemeId, ThemeSpec } from '@/types/theme'
import { THEME_SPECS } from './themeSpecs'

const ThemeContext = createContext<ThemeSpec>(THEME_SPECS.home)

export function ThemeProvider({ themeId, children }: { themeId: ThemeId; children: ReactNode }) {
  const spec = THEME_SPECS[themeId]
  return (
    <ThemeContext.Provider value={spec}>
      <div data-theme={themeId} className="min-h-dvh bg-[var(--bg)] text-[var(--ink)] font-[var(--font-body)]">
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeSpec {
  return useContext(ThemeContext)
}
