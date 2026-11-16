import { Skeleton } from '@/components/ui/skeleton'

export function Skeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
    </div>
  )
}
