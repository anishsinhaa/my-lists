import { Skeleton } from '@/components/ui/skeleton'

export function PosterSkeletons({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="aspect-2/3 w-full rounded-(--radius)" />
      ))}
    </div>
  )
}
