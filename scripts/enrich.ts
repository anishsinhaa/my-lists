import dotenv from 'dotenv'
import { getEnv } from '../server/config/env.js'
import { backfillAll } from '../server/images/backfill.js'
import { authHeaders, fetchJson, omdbKey } from '../server/images/http.js'
import { openLibrary } from '../server/images/openLibrary.js'
import { rawg } from '../server/images/rawg.js'
import { logSample } from '../server/images/samples.js'
import { tmdbAnime, tmdbMovies, tmdbSeries } from '../server/images/tmdb.js'
import { createSheetsClient } from '../server/sheets/client.js'
import { POSTER_LISTS, TAB_NAME, type ListId } from '../src/types/lists.js'

dotenv.config()

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

async function probeDetails(kind: 'movie' | 'tv', id: string): Promise<void> {
  const body = record(await fetchJson(`https://api.themoviedb.org/3/${kind}/${id}?append_to_response=external_ids`, { headers: authHeaders() }))
  logSample(`tmdb.${kind}.details`, { id: body.id, title: body.title ?? body.name, poster_path: body.poster_path, imdb_id: body.imdb_id ?? null, external_ids: body.external_ids ?? null, vote_average: body.vote_average ?? null })
}

async function probe(label: string, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (error) {
    console.log(`SAMPLE ${label} failed: ${error instanceof Error ? error.message : 'network'}`)
  }
}

await probe('tmdb.search.movie', async () => {
  const movie = await tmdbMovies.lookup({ title: 'Triangle of Sadness (2022)', year: 2022, need: ['poster', 'imdbRating'] })
  if (movie !== null) await probeDetails('movie', movie.sourceId)
})
await probe('tmdb.search.tv', async () => {
  const series = await tmdbSeries.lookup({ title: 'Breaking Bad', year: 2008, need: ['poster'] })
  if (series !== null) await probeDetails('tv', series.sourceId)
})
await probe('tmdb.anime', async () => { await tmdbAnime.lookup({ title: 'Cowboy Bebop', year: 1998, need: ['poster'] }) })
await probe('rawg', async () => { await rawg.lookup({ title: 'Hades', year: 2020, need: ['poster', 'imdbRating'] }) })
await probe('openlibrary', async () => { await openLibrary.lookup({ title: 'Dune', year: 1965, author: 'Frank Herbert', need: ['poster', 'imdbRating'] }) })
if (omdbKey().length === 0) console.log('SAMPLE omdb skipped: OMDB_API_KEY is empty, so IMDb Rating stays blank')

const tabs = process.argv.slice(2).filter((arg): arg is ListId => (POSTER_LISTS as readonly string[]).includes(arg))
const reports = await backfillAll(createSheetsClient(getEnv()), console.log, tabs.length > 0 ? { tabs } : {})
for (const report of reports) {
  console.log(`${TAB_NAME[report.tab]}: poster filled ${report.posterFilled} / still missing ${report.posterMissing}; IMDb filled ${report.imdbFilled} / still missing ${report.imdbMissing}`)
  if (report.omdbSkipped > 0) console.log(`  IMDb left blank because OMDB_API_KEY is empty: ${report.omdbSkipped}`)
  const shown = report.failures.slice(0, 40)
  for (const failure of shown) console.log(`  ${failure.title}: ${failure.reason}`)
  if (report.failures.length > shown.length) console.log(`  …and ${report.failures.length - shown.length} more`)
}
