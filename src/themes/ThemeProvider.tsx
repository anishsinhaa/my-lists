import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react'
import type { ThemeId, ThemeSpec } from '@/types/theme'
import { THEME_SPECS } from './themeSpecs'

const ThemeContext = createContext<ThemeSpec>(THEME_SPECS.home)

export function ThemeProvider({ themeId, children }: { themeId: ThemeId; children: ReactNode }) {
  const spec = THEME_SPECS[themeId]
  useLayoutEffect(() => {
    const previous = document.body.dataset.theme
    document.body.dataset.theme = themeId
    return () => {
      if (previous === undefined) delete document.body.dataset.theme
      else document.body.dataset.theme = previous
    }
  }, [themeId])
  return (
    <ThemeContext.Provider value={spec}>
      <div data-theme={themeId} className="min-h-dvh bg-(--bg) text-(--ink) font-(--font-body)">
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeSpec {
  return useContext(ThemeContext)
}
