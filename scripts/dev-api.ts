import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import dotenv from 'dotenv'
import type { VercelRequest, VercelResponse } from '@vercel/node'

dotenv.config()

const port = Number(process.env.API_DEV_PORT ?? 3001)

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.length === 0) {
        resolveBody(undefined)
        return
      }
      try {
        resolveBody(JSON.parse(raw) as unknown)
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string>): void {
  res.statusCode = status
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value)
  if (!res.hasHeader('content-type')) res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

const server = createServer((req, res) => {
  void handle(req, res)
})

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
  if (!url.pathname.startsWith('/api/')) {
    sendJson(res, 404, { ok: false, error: { code: 'not_found', message: 'Not found' } }, {})
    return
  }
  const route = url.pathname.slice('/api/'.length).replace(/\/+$/, '')
  if (route.length === 0 || route.split('/').some((part) => part === '..' || part === '.' || part.length === 0)) {
    sendJson(res, 404, { ok: false, error: { code: 'not_found', message: 'Not found' } }, {})
    return
  }

  const filePath = resolve(import.meta.dirname, '..', 'api', `${route}.ts`)
  const apiRoot = resolve(import.meta.dirname, '..', 'api')
  if (!filePath.startsWith(apiRoot)) {
    sendJson(res, 404, { ok: false, error: { code: 'not_found', message: 'Not found' } }, {})
    return
  }

  let handler: ((request: VercelRequest, response: VercelResponse) => Promise<void>) | undefined
  try {
    const loaded: unknown = await import(pathToFileURL(filePath).href)
    if (typeof loaded === 'object' && loaded !== null && 'default' in loaded && typeof loaded.default === 'function') {
      handler = loaded.default as (request: VercelRequest, response: VercelResponse) => Promise<void>
    }
  } catch {
    handler = undefined
  }
  if (handler === undefined) {
    sendJson(res, 404, { ok: false, error: { code: 'not_found', message: 'Not found' } }, {})
    return
  }

  let body: unknown
  try {
    body = await readBody(req)
  } catch {
    sendJson(res, 400, { ok: false, error: { code: 'bad_request', message: 'Invalid JSON' } }, {})
    return
  }

  const query: Record<string, string> = {}
  for (const [key, value] of url.searchParams) query[key] = value
  const headers: Record<string, string> = {}
  const vercelRes = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      headers[name] = value
      return this
    },
    json(data: unknown) {
      sendJson(res, this.statusCode, data, headers)
    },
  }
  const vercelReq = { method: req.method, query, body, headers: req.headers }
  await handler(vercelReq as VercelRequest, vercelRes as unknown as VercelResponse)
}

server.listen(port, () => {
  console.warn(`api listening on http://127.0.0.1:${port}`)
})
