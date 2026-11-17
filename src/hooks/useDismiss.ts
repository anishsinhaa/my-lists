import { useEffect, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

export function useDismiss(open: boolean, close: () => void, inside: RefObject<HTMLElement | null>): void {
  const { pathname } = useLocation()

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event: PointerEvent) => {
      const node = inside.current
      const target = event.target
      if (node !== null && target instanceof Node && node.contains(target)) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [close, inside, open])

  useEffect(() => {
    close()
  }, [close, pathname])
}
