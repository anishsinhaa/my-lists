import { ThemeProvider } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-background p-6 text-foreground">
        <h1 className="text-2xl font-semibold">My Lists</h1>
        <Input placeholder="Search your lists" aria-label="Search" />
        <Skeleton className="h-10 w-full" />
        <Button type="button" onClick={() => toast('Styled button works')}>
          Styled button
        </Button>
      </main>
      <Toaster />
    </ThemeProvider>
  )
}
