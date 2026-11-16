import { useState } from 'react'
import { readJson, writeJson } from '@/lib/storage'

export function useLocalStorage<T>(key: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readJson(key, fallback))
  return [value, (next) => {
    setValue(next)
    writeJson(key, next)
  }]
}
