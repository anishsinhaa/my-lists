import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { ListId } from '@/types/lists'
import type { ThemeId } from '@/types/theme'

export function themeForList(listId: ListId): ThemeId {
  if (listId === 'movies' || listId === 'series' || listId === 'anime' || listId === 'games' || listId === 'books') return listId
  return 'other'
}

export function onSearchKey(event: ReactKeyboardEvent, count: number, active: number, onActive: (index: number) => void, onChoose: (index: number) => void): void {
  if (count === 0) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    onActive(Math.min(count - 1, active + 1))
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    onActive(Math.max(0, active - 1))
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    onChoose(active)
  }
}
