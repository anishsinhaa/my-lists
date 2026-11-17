import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error === null) return this.props.children
    return (
      <main className="p-6">
        <h1 className="text-xl">Something went wrong</h1>
        <p className="mt-2 text-sm">{this.state.error.message}</p>
        <Button className="mt-4" type="button" onClick={() => this.setState({ error: null })}>Try again</Button>
      </main>
    )
  }
}
