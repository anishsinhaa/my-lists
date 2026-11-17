import { ProviderError, RetryableError } from './types.js'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class Throttle {
  private chain: Promise<unknown> = Promise.resolve()

  private readonly minIntervalMs: number

  constructor(minIntervalMs: number) {
    this.minIntervalMs = minIntervalMs
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    const job = this.chain.then(async () => {
      let attempt = 0
      while (true) {
        try {
          const result = await fn()
          if (this.minIntervalMs > 0) await sleep(this.minIntervalMs)
          return result
        } catch (error) {
          if (error instanceof RetryableError && attempt < 2) {
            attempt += 1
            await sleep(error.retryAfterMs)
            continue
          }
          if (error instanceof RetryableError) throw new ProviderError('upstream rate limit')
          throw error
        }
      }
    })
    this.chain = job.then(() => undefined, () => undefined)
    return job
  }
}
