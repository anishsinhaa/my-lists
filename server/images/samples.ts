const seen = new Set<string>()

export function logSample(name: string, body: unknown): void {
  if (process.env.VITEST === 'true' || seen.has(name)) return
  seen.add(name)
  const json = JSON.stringify(body)
  const text = json.length > 1500 ? `${json.slice(0, 1500)}…` : json
  console.log(`SAMPLE ${name} ${text}`)
}
