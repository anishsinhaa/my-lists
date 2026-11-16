import { Button } from '@/components/ui/button'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/40 p-6">
      <p className="text-sm">{message}</p>
      {onRetry !== undefined ? <Button className="mt-3" type="button" variant="outline" onClick={onRetry}>Try again</Button> : null}
    </div>
  )
}
