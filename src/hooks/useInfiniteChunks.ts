import { useEffect, useRef, useState, type RefObject } from 'react'

export function useInfiniteChunks<T>(items: T[], chunk = 60): { visible: T[]; sentinelRef: RefObject<HTMLDivElement | null>; hasMore: boolean } {
  const [count, setCount] = useState(chunk)
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setCount(chunk)
  }, [chunk, items])
  useEffect(() => {
    const node = sentinelRef.current
    if (node === null) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((current) => Math.min(items.length, current + chunk))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [chunk, count, items.length])
  return { visible: items.slice(0, count), sentinelRef, hasMore: count < items.length }
}
