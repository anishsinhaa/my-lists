import { z } from 'zod'

const schema = z.object({
  AUTH_USERNAME: z.string().min(1),
  AUTH_PASSWORD_HASH: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1).default('30d'),
  GUEST_MODE: z.string().default('true'),
  GUEST_EXPIRES_IN: z.string().min(1).default('7d'),
  GOOGLE_SHEET_ID: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().min(1),
  GOOGLE_PRIVATE_KEY: z.string().min(1).transform((value) => value.replace(/\\n/g, '\n')),
  TMDB_READ_TOKEN: z.string().min(1),
  OMDB_API_KEY: z.string().default(''),
  RAWG_API_KEY: z.string().min(1),
  OPEN_LIBRARY_CONTACT: z.string().min(1),
  JIKAN_BASE_URL: z.string().url().default('https://api.jikan.moe/v4'),
  IGDB_CLIENT_ID: z.string().default(''),
  IGDB_CLIENT_SECRET: z.string().default(''),
  FEATURE_PICKS: z.string().default('true'),
  VITE_FEATURE_PICKS: z.string().default('true'),
  FEATURE_ADD: z.string().default('false'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default(''),
  API_DEV_PORT: z.coerce.number().int().positive().default(3001),
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].filter((name) => name.length > 0)
    throw new Error(`Missing or invalid environment variables: ${names.join(', ')}`)
  }
  return parsed.data
}

export function getEnv(): Env {
  cached ??= parseEnv(process.env)
  return cached
}

export function resetEnvCache(): void {
  cached = undefined
}
