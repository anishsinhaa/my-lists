import type { TabId } from '../../src/types/lists.js'
import { openLibrary } from './openLibrary.js'
import { rawg } from './rawg.js'
import { tmdbAnime, tmdbMovies, tmdbSeries } from './tmdb.js'
import type { PosterProvider } from './types.js'

export function providerFor(tab: TabId): PosterProvider | null {
  if (tab === 'movies' || tab === 'movies-picks') return tmdbMovies
  if (tab === 'series' || tab === 'series-picks') return tmdbSeries
  if (tab === 'anime') return tmdbAnime
  if (tab === 'games' || tab === 'games-picks') return rawg
  if (tab === 'books') return openLibrary
  return null
}
