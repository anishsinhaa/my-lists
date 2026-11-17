export const BRAND = {
  name: 'My Lists',
  mark: 'My Lists™',
  owner: 'Anish Sinha',
  tagline: 'A private archive',
  rawg: 'https://rawg.io',
  tmdb: 'https://www.themoviedb.org/',
  omdb: 'https://www.omdbapi.com/',
  openLibrary: 'https://openlibrary.org/',
} as const

export const COPYRIGHT_YEAR = 2026

export function copyrightLine(year = COPYRIGHT_YEAR): string {
  return `© ${year} ${BRAND.owner} · ${BRAND.mark} · a personal archive`
}
