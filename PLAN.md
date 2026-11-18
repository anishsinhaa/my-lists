# My Lists — Implementation Plan

Personal web app to browse media lists stored in a Google Sheet. React + Vite + TypeScript SPA, Vercel-style serverless functions in `api/`, Google Sheets as the only datastore. Build and run locally first; deploy to Vercel later.

Package versions below were verified against npm on 2026-11-16.

---

## 0. How to use this plan (agent protocol)

Give the coding agent ONE step per prompt, using this template:

```
Read PLAN.md sections 1-8 and .cursor/rules/my-lists.mdc once.
Implement ONLY "Step N: <name>" from PLAN.md section 9.
Touch only the files listed under "Files to create/edit". Never touch "Do not touch".
When done run: npm run typecheck && npm run lint && npm run test
Then walk the step's checklist and report each item as pass/fail. Do not start Step N+1.
```

Rules for every step:
- If a step needs a file not listed, STOP and ask instead of editing it.
- Commit after each passing step: `git add -A && git commit -m "step N: <name>"`.
- Windows + PowerShell: no `&&`-dependent one-liners in npm scripts; use `npm run` scripts; use forward slashes in code paths.

## 1. Decisions and assumptions (correct these before Step 1)

1. Games images: RAWG is the default provider (one `RAWG_API_KEY`, no OAuth). IGDB stays a documented drop-in alternative behind the same `PosterProvider` interface (env vars reserved).
2. Picks Status values the app may write match the TARGET main tab: Movies picks = `Want to`, `Must watch`, `Maybe`, `Watched`; Series picks = `Want to`, `On hold`, `Maybe later`, `Watched`; Games picks = `Want to`, `Played`, `Completed`, `On hold`. A blank Status means "not chosen / not interested". "Skip" is NOT a sheet value: it only hides the card locally for the current browser session and writes nothing. Constants live in `src/types/picks.ts`.
3. Two rating columns. `My Rating` = the user's own score, entered manually, 0–10 (also parses `8/10`, `4/5`, `80%`, star glyphs); the app NEVER writes it. `IMDb Rating` = auto-filled ONCE into empty cells only, stored in the sheet as a plain number 0–10 with one decimal. Despite the header name, the source depends on the list: movies/series = IMDb via OMDb; anime = MyAnimeList score via Jikan; games = Metacritic/10 via RAWG (fallback RAWG rating x2); books = Open Library `ratings_average` x2. The UI labels it per list (IMDb / MAL / Metacritic / Open Library). "Effective rating" for sorting, top-rated views and rating filters = `myRating ?? imdbRating`. The app NEVER writes My Rating, Year, Status (main tabs), Title, Genre, Why, Updated at, or Platform.
3b. Fetch-once principle: Poster, IMDb Rating, Director/Creator and Franchise are each fetched from an external API at most ONCE per row and saved into the sheet. After that the app reads them from the sheet only. External APIs are called only for rows whose target cell is empty (and not in the 7-day local miss cache). A normal page load with all cells filled makes zero external API calls (poster image files are loaded by the browser from the image CDN, which is not an API call).
4. Books, Other, Curious status values were not specified: statuses are free strings; unknown ones render with a neutral chip and group `unknown`. Known Books words (Reading, Read, Want to, Dropped, Paused) are mapped in `STATUS_GROUP`.
5. Animation package: `motion` (the renamed Framer Motion, v14.14.0, import from `motion/react`). `framer-motion` 14.14.0 is the same code; use only one.
6. The sheet owner manually adds the new header cells (Poster, Director/Creator, Franchise, My Rating, IMDb Rating, Platform for games) to the right of existing columns. The app never edits headers. If you already have a "Rating" column, rename it to "My Rating" (the legacy header `Rating` is still read as My Rating).
7. The service account is a full Editor of the Sheet, because an assistant also edits it through the API. There are NO Google protected ranges; write safety is enforced only by app code (`WRITE_POLICY`, compare-and-set, never delete/sort/insert).

## 2. Stack and versions

Scaffold with `npm create vite@latest my-lists -- --template react-ts`, then KEEP the template's pinned versions of vite, react, react-dom, typescript, @vitejs/plugin-react, eslint (as of 2026-11-16: vite 8.3.8, react 19.3.1, typescript 7.0.2, @vitejs/plugin-react 6.3.0). If `tsc -b` fails with TypeScript 7, pin typescript to the latest 5.x and note it in `docs/DECISIONS.md`.

Install with `--save-exact` (versions pinned):
- Runtime: `tailwindcss@4.3.5`, `@tailwindcss/vite@4.3.5`, `motion@14.14.0`, `fuse.js@7.5.0`, `react-router-dom@7.18.5`, `@tanstack/react-query@5.107.1`, `embla-carousel-react@8.6.0`, `lucide-react@1.73.0`, `clsx@2.1.1`, `tailwind-merge@3.7.0`, `class-variance-authority@0.7.1`, `tw-animate-css@1.4.0`, `zod@4.6.7`
- shadcn: `npx shadcn@4.23.0 init` (Tailwind v4 mode, style `new-york`, base color `neutral`, CSS variables yes, alias `@/`)
- Server: `jose@6.2.17`, `bcryptjs@3.0.3`, `@googleapis/sheets` (run `npm view @googleapis/sheets version`, pin that), `p-limit@7.3.3`, `dotenv@18.0.10`
- Dev: `vitest@5.1.0`, `@testing-library/react@16.3.3`, `jsdom`, `@types/node@26.6.6`, `@vercel/node@31.0.0` (types only), `tsx`, `concurrently` (pin whatever `npm view` returns)
- Fonts (fontsource, self-hosted, pin `npm view` versions; if a package name 404s pick the closest and record it): `@fontsource/bebas-neue`, `@fontsource-variable/inter`, `@fontsource-variable/fraunces`, `@fontsource-variable/nunito`, `@fontsource/bowlby-one`, `@fontsource/poppins`, `@fontsource-variable/orbitron`, `@fontsource/rajdhani`, `@fontsource-variable/lora`, `@fontsource-variable/source-serif-4`
- shadcn components to add (Step 2): button, input, badge, skeleton, sonner, toggle-group, select, popover, sheet, slider, command, dropdown-menu, tabs, tooltip, separator, scroll-area

Do not add: Redux, Axios, styled-components, moment, lodash, any CSS-in-JS, any UI kit besides shadcn.

## 3. Folder structure

```
my-lists/
  PLAN.md
  .cursor/rules/my-lists.mdc
  .env.example            .env (git-ignored)      .gitignore
  package.json  tsconfig.json  tsconfig.app.json  tsconfig.node.json  tsconfig.api.json
  vite.config.ts  vitest.config.ts  vercel.json  components.json  eslint.config.js  index.html
  public/  brand/  manifest.webmanifest
  docs/    DECISIONS.md  SETUP.md
  api/                                  # Vercel functions (thin wrappers only, <= 12 files on Hobby)
    health.ts                           # GET  /api/health
    lists.ts                            # GET  /api/lists
    auth/login.ts                       # POST /api/auth/login
    auth/me.ts                          # GET  /api/auth/me
    posters/fill.ts                     # POST /api/posters/fill
    picks/status.ts                     # POST /api/picks/status
    add/preview.ts  add/confirm.ts      # Phase 2 only
  server/                               # all server logic; NOT deployed as functions
    config/env.ts                       # zod-validated env
    http/ respond.ts withAuth.ts errors.ts rateLimit.ts types.ts
    auth/ AuthProvider.ts EnvAuthProvider.ts tokens.ts index.ts
    sheets/ client.ts headers.ts mapping.ts readAll.ts rowKey.ts writeGuard.ts writeCells.ts cache.ts config.ts
    images/ types.ts throttle.ts match.ts tmdb.ts omdb.ts rawg.ts jikan.ts openLibrary.ts resolve.ts   # all external metadata providers (poster, creator, franchise, imdbRating)
    ai/ gemini.ts                       # Phase 2
    **/__tests__/*.test.ts
  scripts/ dev-api.ts hash-password.ts check-sheet.ts
  src/
    main.tsx  App.tsx  router.tsx  index.css  vite-env.d.ts
    types/ lists.ts media.ts picks.ts api.ts auth.ts theme.ts index.ts
    lib/ utils.ts normalize.ts dates.ts storage.ts rating.ts
    hooks/ useLocalStorage.ts useMediaQuery.ts useDebouncedValue.ts useInfiniteChunks.ts useOnline.ts
    themes/ themes.css themeSpecs.ts motion.ts ThemeProvider.tsx fonts.ts
    components/
      ui/            # shadcn generated, do not hand-edit except via CLI
      layout/        AppShell.tsx PageTransition.tsx TopBar.tsx BottomNav.tsx
      common/        StatusChip.tsx PosterImage.tsx PosterFallback.tsx RatingBadge.tsx EmptyState.tsx ErrorState.tsx Skeletons.tsx CountUp.tsx ErrorBoundary.tsx
    services/
      auth/    AuthService.ts localTokenAuthService.ts
      http/    apiFetch.ts
      sheets/  listsApi.ts listsCache.ts picksApi.ts
      images/  posterApi.ts
    features/
      auth/    AuthContext.tsx AuthProvider.tsx RequireAuth.tsx LoginPage.tsx
      data/    useLists.ts selectors.ts
      home/    HomePage.tsx GlobalSearch.tsx SearchResultRow.tsx
      search/  searchIndex.ts useGlobalSearch.ts
      lists/
        MyListsPage.tsx ListCategoryCard.tsx ListCarousel.tsx
        ListPage.tsx SimpleListPage.tsx ListHeader.tsx ListStatsHeader.tsx ViewToggle.tsx SortMenu.tsx
        views/   PosterGrid.tsx PosterCard.tsx ListTable.tsx SplitView.tsx
        filters/ FilterBar.tsx filterConfig.ts listQuery.ts applyListQuery.ts
        smart/   smartViews.ts SmartViewChips.tsx
        stats/   computeStats.ts
        cards/   MovieCard.tsx SeriesCard.tsx AnimeCard.tsx GameCard.tsx BookCard.tsx
      posters/ usePosterFill.ts negativeCache.ts
      picks/   PicksPage.tsx PickDeck.tsx PickCard.tsx usePicksQueue.ts
      add/     (Phase 2, empty placeholder)
    test/ setup.ts fixtures/sheetValues.ts
```

Rules: `src/` may not import from `server/` or `api/`. `server/` and `api/` may import ONLY these from `src/`, and only with relative `.js` extension: `src/types/*`, `src/lib/normalize.ts`, `src/lib/dates.ts`, `src/lib/rating.ts` (these must stay pure: no DOM, no React).

## 4. Data model and sheet mapping

### 4.1 Core types (`src/types/lists.ts`)

```ts
export const LIST_IDS = ['movies','series','anime','games','books','other','curious'] as const;
export type ListId = typeof LIST_IDS[number];
export const PICKS_IDS = ['movies-picks','series-picks','games-picks'] as const;
export type PicksId = typeof PICKS_IDS[number];
export type TabId = ListId | PicksId;
export type MediaKind = 'movie'|'series'|'anime'|'game'|'book'|'other';

export const TAB_NAME: Record<TabId,string> = {
  movies:'Movies', series:'Series', anime:'Anime', games:'Games', books:'Books', other:'Other', curious:'Curious',
  'movies-picks':'Movies picks','series-picks':'Series picks','games-picks':'Games picks',
};
export const LIST_KIND: Record<ListId,MediaKind> = { movies:'movie', series:'series', anime:'anime', games:'game', books:'book', other:'other', curious:'other' };
export const POSTER_LISTS: readonly ListId[] = ['movies','series','anime','games','books'];
export const PICKS_TARGET: Record<PicksId,ListId> = {'movies-picks':'movies','series-picks':'series','games-picks':'games'};

export const STATUSES = {
  series: ['In progress','Paused','Waiting for next season','Rewatch from start','Next season out','On hold','Want to','Maybe later','Watched','Dropped'],
  anime:  ['In progress','Paused','Waiting for next season','Rewatch from start','Next season out','On hold','Want to','Maybe later','Watched','Dropped'],
  movies: ['In progress','Must watch','Want to','Maybe','Watched','Dropped'],
  games:  ['Want to','Playing','Played','Completed','Dropped','Paused','Replay from start','On hold'],
} as const;

export type StatusGroup = 'active'|'planned'|'maybe'|'waiting'|'paused'|'done'|'dropped'|'unknown';
// keys are normalizeKey(status) (lowercase, trimmed)
export const STATUS_GROUP: Record<string,StatusGroup> = {
  'in progress':'active','playing':'active','reading':'active','rewatch from start':'active','replay from start':'active',
  'want to':'planned','must watch':'planned',
  'maybe':'maybe','maybe later':'maybe',
  'waiting for next season':'waiting','next season out':'waiting',
  'paused':'paused','on hold':'paused',
  'watched':'done','played':'done','completed':'done','read':'done',
  'dropped':'dropped',
};
export function statusGroupOf(status: string): StatusGroup; // lookup, default 'unknown'
```

### 4.2 Items (`src/types/media.ts`)

```ts
export interface MediaItem {
  id: string;               // `${listId}:${titleKey}:${year ?? ''}` ; duplicates get suffix `~2`, `~3` in sheet order
  listId: ListId;
  title: string;            // trimmed original
  titleKey: string;         // normalizeTitle(title)
  status: string;           // raw trimmed, '' if empty
  statusGroup: StatusGroup;
  year: number | null;
  genres: string[];         // split on , / ; |  trimmed, de-duplicated
  why: string;
  updatedAt: string | null; // ISO-8601
  poster: string | null;    // https URL only
  creator: string | null;   // director / author / developer
  franchise: string | null;
  myRating: number | null;   // 0..10, manual, never written by the app (headers: My Rating / legacy Rating)
  imdbRating: number | null; // 0..10, auto-filled once (header: IMDb Rating); source depends on list, see externalRatingLabel()
  platform: string | null;
  extra: Record<string,string>; // unmapped columns (used by Other/Curious)
}
export interface PickItem {
  id: string;               // `${picksId}:${titleKey}:${year ?? ''}:${becauseKey}`
  picksId: PicksId;
  targetList: ListId;
  title: string; titleKey: string;
  becauseYouLiked: string; becauseKey: string;
  year: number | null; genres: string[];
  status: string;           // '' = not chosen yet (blank also means "not interested"); never 'Skip'
  why: string; poster: string | null;
}
export type EnrichField = 'poster'|'creator'|'franchise'|'imdbRating';
// helpers in src/lib/rating.ts
export function effectiveRating(i: { myRating: number|null; imdbRating: number|null }): number | null; // myRating ?? imdbRating
export function externalRatingLabel(listId: ListId): string; // movies/series 'IMDb', anime 'MAL', games 'Metacritic', books 'Open Library', else 'Rating'
export interface SheetWarning { tab: TabId; code: 'missing_tab'|'missing_title_column'|'missing_header'|'duplicate_title'|'bad_value'; message: string }
export interface ListsPayload {
  fetchedAt: string;        // ISO
  dataHash: string;         // sha1 of JSON of lists+picks, used for cheap equality
  lists: Record<ListId, MediaItem[]>;
  picks: Record<PicksId, PickItem[]>;
  warnings: SheetWarning[];
  columns: Record<TabId, Record<EnrichField, boolean>>; // which enrichment columns exist in each tab (header present); picks tabs only ever use 'poster'
}
```

### 4.3 Header-driven mapping (`server/sheets/headers.ts`)

Never use fixed column letters. Row 1 is the header row. Resolve each field to a column index by normalized header text; unknown headers go to `extra`.

```ts
export type MainField = 'title'|'status'|'year'|'genre'|'why'|'updatedAt'|'poster'|'creator'|'franchise'|'myRating'|'imdbRating'|'platform';
export type PicksField = 'title'|'because'|'year'|'genre'|'status'|'why'|'poster';
export const MAIN_ALIASES: Record<MainField,string[]> = {
  title:['title','name'], status:['status'], year:['year','release year'], genre:['genre','genres'],
  why:['why','notes','note','reason'], updatedAt:['updated at','updated','last updated'],
  poster:['poster','poster url','cover'], creator:['director/creator','director','creator','author','developer'],
  franchise:['franchise','universe','collection'],
  myRating:['my rating','my score','rating'],            // legacy plain "Rating" is treated as My Rating
  imdbRating:['imdb rating','imdb','external rating','mal score','metacritic'],
  platform:['platform','platforms'],
};
// Aliases are matched by exact normalized header equality, never substring (so "imdb rating" can never be read as "rating").
export const PICKS_ALIASES: Record<PicksField,string[]> = {
  title:['title','name'], because:['because you liked','because'], year:['year'], genre:['genre','genres'],
  status:['status'], why:['why','reason'], poster:['poster','poster url','cover'],
};
export function normalizeHeader(h: unknown): string; // String(h).toLowerCase().trim().replace(/\s+/g,' ').replace(/:$/,'')
export interface ColumnMap<F extends string> { index: Partial<Record<F, number>>; extras: Array<{header:string; index:number}>; headerRow: string[] }
export function buildColumnMap<F extends string>(headerRow: unknown[], aliases: Record<F,string[]>): ColumnMap<F>;
export function columnLetter(index0: number): string; // 0->A, 25->Z, 26->AA
```
Other/Curious: if no `title` header, use the first non-empty header as title. Required for every tab: `title`; if missing push `missing_title_column` and return `[]` for that tab (never throw).

Per tab columns (existing + added): Movies/Series/Anime = Title, Status, Year, Genre, Why, Updated at, +Poster, Director/Creator, Franchise, My Rating, IMDb Rating. Games = same + Platform. Books = same set (Director/Creator holds Author). Picks = Title | Because you liked | Year | Genre | Status | Why (+ optional Poster). New columns are appended to the RIGHT of the last used column; because mapping is header-based, nothing existing breaks.

### 4.4 Parsing rules (`server/sheets/mapping.ts`, `src/lib/*`)

- Read with `valueRenderOption=UNFORMATTED_VALUE`, `dateTimeRenderOption=SERIAL_NUMBER`.
- `parseYear(v: unknown): number|null` accepts number or string containing a 4-digit year 1880–2100 (first match).
- `parseUpdatedAt(v: unknown): string|null`: number => Google serial (days since 1899-12-30) to ISO; string => try ISO, `dd/mm/yyyy [hh:mm]`, `mm/dd/yyyy` only if day>12 is impossible otherwise assume dd/mm; else null.
- `parseRating(v: unknown): number|null` (`src/lib/rating.ts`, used for BOTH My Rating and IMDb Rating): number 0–10 (decimal comma `"8,1"` accepted); `"8/10"`, `"4/5"` scaled to 10; `"80%"` → 8; star glyphs counted (★ = 2 on a 5 scale); `"N/A"`, empty, out of range → null. Values are rounded to 1 decimal.
- `effectiveRating(item)` = `myRating ?? imdbRating`; used by sort "Rating", "top rated" smart views, rating filter (default mode), stats and poster-collage ordering.
- `splitGenres(v): string[]` split on `[,/;|]`, trim, title-case first letter, dedupe case-insensitively.
- `normalizeTitle(s)` (`src/lib/normalize.ts`): NFKD, strip diacritics, lowercase, `&`→`and`, remove non-alphanumerics except spaces, collapse spaces, trim. Do NOT strip leading "the".
- `sanitizePosterUrl(v): string|null`: only `https://` URLs, max 500 chars.
- Skip rows whose title is empty. Duplicate titles in a tab: keep all, suffix ids, push `duplicate_title` warning.

### 4.5 Write policy (hard rule)

`server/sheets/client.ts` exposes ONLY:
```ts
export interface SheetsClient {
  batchGetValues(ranges: string[]): Promise<Array<{ range: string; values: unknown[][] }>>;
  batchUpdateValues(updates: Array<{ range: string; value: string | number }>): Promise<void>; // valueInputOption RAW; numbers (IMDb Rating) are sent as JSON numbers so the cell is numeric
}
```
No append, clear, delete, insert, sort, or format calls exist anywhere. `server/sheets/writeGuard.ts`:
```ts
export type WritableField = 'poster'|'creator'|'franchise'|'imdbRating'|'pickStatus';
// 'myRating' is deliberately NOT a WritableField: it cannot even be expressed in a CellWrite.
const ENRICH: readonly WritableField[] = ['poster','creator','franchise','imdbRating'];
export const WRITE_POLICY: Record<TabId, readonly WritableField[]> = {
  movies:ENRICH, series:ENRICH, anime:ENRICH, games:ENRICH, books:ENRICH, other:[], curious:[],
  'movies-picks':['pickStatus','poster'], 'series-picks':['pickStatus','poster'], 'games-picks':['pickStatus','poster'],
};
// Enrichment fields (poster, creator, franchise, imdbRating) are fill-only: expectedCurrent MUST be '' (assertFillOnly throws otherwise).
// 'pickStatus' is the only field that may overwrite a non-empty cell, and only compare-and-set against expectedCurrent.
export function assertWritable(tab: TabId, field: WritableField): void; // throws WriteForbiddenError
```
`server/sheets/writeCells.ts`:
```ts
export interface CellWrite {
  tab: TabId; field: WritableField; titleKey: string; year: number|null; becauseKey?: string; // picks only
  value: string | number; // imdbRating is a number 0..10 with 1 decimal; all other fields strings; pickStatus may be '' only for undo
  expectedCurrent: string; // '' means the cell must still be empty; otherwise exact current text (numbers compared as String(v))
}
export type WriteOutcome = 'written'|'skipped_not_found'|'skipped_ambiguous'|'skipped_conflict'|'skipped_missing_column'|'skipped_policy'|'error';
export interface WriteResult { write: CellWrite; outcome: WriteOutcome; currentValue?: string; detail?: string }
export function writeCells(client: SheetsClient, writes: CellWrite[]): Promise<WriteResult[]>;
```
Algorithm (per call): (1) group by tab; (2) `batchGetValues(["'<Tab>'!A1:Z3000", ...])` FRESH; (3) rebuild ColumnMap; (4) locate each target row by `titleKey` (+ `year` if >1 match, + `becauseKey` for picks); 0 matches → `skipped_not_found`; still >1 → `skipped_ambiguous`; (5) target column missing → `skipped_missing_column`; (6) current cell text !== `expectedCurrent` → `skipped_conflict`; (7) one `batchUpdateValues` with A1 ranges like `'Movies'!M17`; (8) verify: re-read the title cells of written rows; if a title no longer matches, restore ONLY the cell we wrote (if it still equals our value) to `expectedCurrent` and mark `error` with `detail:'row_moved'`. Row numbers are never persisted or returned to the client.

There is no Google-side protection (no protected ranges): an assistant edits the Sheet through the API with full access and the service account is a normal Editor. All write safety lives in this app's code (`WRITE_POLICY`, fill-only enrichment, compare-and-set, no destructive calls).

### 4.6 Fetch-once enrichment rule (hard rule)

- The Sheet is the permanent cache. Enrichment fields are `EnrichField = 'poster'|'creator'|'franchise'|'imdbRating'`.
- The ONLY code that may call TMDB/OMDb/RAWG/Jikan/Open Library is `server/images/*`, and the ONLY entry point to it is `POST /api/posters/fill`. `GET /api/lists`, search, filters, picks, and page loads never call them (a test asserts `server/sheets/readAll.ts` has no import path to `server/images`).
- The client sends an item only when: the row's field is empty in the loaded payload AND `payload.columns[tab][field]` is true (header exists) AND no 7-day miss entry exists for `${tab}:${titleKey}:${year}:${field}`. If every enrichment cell of a row is filled, nothing is sent.
- The server then re-reads the tab FRESH and recomputes which fields are still empty for each item (so values filled meanwhile by you/the assistant/another device are never re-fetched), calls providers only for those fields, and writes with `expectedCurrent: ''` (fill-only). An item with nothing missing returns `outcome: 'already_filled'` with zero provider calls.
- Providers are asked only for what is missing (e.g. if only `imdbRating` is empty, no poster/credits calls beyond what is required to find the match).
- A field a provider cannot supply is recorded in the local miss cache for 7 days and is NOT written to the sheet (no placeholder text), so a later manual entry always wins.

## 5. Environment variables and external setup

`.env.example` (committed; real `.env` git-ignored):
```
# --- Auth ---
AUTH_USERNAME=
# bcrypt hash, SINGLE-QUOTED because it contains $ characters. Generate: npm run hash -- "your-password"
AUTH_PASSWORD_HASH='$2b$12$replace_me'
# >= 32 chars. Generate: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
JWT_SECRET=
JWT_EXPIRES_IN=30d

# --- Google Sheets (service account) ---
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
# paste the private_key from the JSON key, keep the literal \n sequences, wrap in double quotes
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# --- Images ---
TMDB_READ_TOKEN=
OMDB_API_KEY=
RAWG_API_KEY=
OPEN_LIBRARY_CONTACT=you@example.com
JIKAN_BASE_URL=https://api.jikan.moe/v4
# optional alternative to RAWG
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=

# --- Feature flags ---
FEATURE_PICKS=true
VITE_FEATURE_PICKS=true
FEATURE_ADD=false

# --- Phase 2 ---
GEMINI_API_KEY=
GEMINI_MODEL=            # verify current free-tier model id in AI Studio before use

# --- Dev ---
API_DEV_PORT=3001
```
`server/config/env.ts`: zod schema, `getEnv()` memoized, `JWT_SECRET.min(32)`, `GOOGLE_PRIVATE_KEY` transformed with `.replace(/\\n/g,'\n')`. Missing vars produce one readable error listing all names (never print values). Only `VITE_*` vars are visible to the browser; never put a secret in a `VITE_` var.

Setup steps (write into `docs/SETUP.md` in Step 1):
1. Google Cloud: console.cloud.google.com > new project `my-lists` > APIs & Services > Library > enable "Google Sheets API" > IAM & Admin > Service Accounts > Create (`my-lists-reader`) > Keys > Add key > JSON > download > copy `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `private_key` -> `GOOGLE_PRIVATE_KEY`. Open the Sheet > Share > add the service account email as **Editor**. Sheet id = the long string in the sheet URL between `/d/` and `/edit` -> `GOOGLE_SHEET_ID`. Add the new header cells manually (section 4.3).
2. TMDB: themoviedb.org > Settings > API > create (personal use) > copy "API Read Access Token (v4)" -> `TMDB_READ_TOKEN`.
2b. OMDb (IMDb ratings for movies/series): omdbapi.com/apikey.aspx > FREE tier > confirm the emailed activation link -> `OMDB_API_KEY` (free tier ~1,000 requests/day; the fetch-once rule keeps usage tiny).
3. RAWG: rawg.io/apidocs > get API key -> `RAWG_API_KEY` (free tier is limited and requires attribution; footer link "Data: RAWG").
4. IGDB (optional): dev.twitch.tv > Applications > Register > Client ID/Secret; server uses client-credentials token and `POST https://api.igdb.com/v4/games`.
5. Jikan (MyAnimeList scores) and Open Library (book ratings): no key. Set `OPEN_LIBRARY_CONTACT` (used in User-Agent).
6. Gemini (Phase 2): aistudio.google.com > Get API key -> `GEMINI_API_KEY`.
7. Vercel (later): import repo, copy every non-`VITE_` and `VITE_` var into Project Settings > Environment Variables; `GOOGLE_PRIVATE_KEY` pasted with real newlines or `\n`.

## 6. API contract (`src/types/api.ts`, used by both sides)

```ts
export type ApiErrorCode = 'unauthorized'|'bad_request'|'rate_limited'|'upstream_error'|'feature_disabled'|'not_found'|'conflict'|'internal';
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: ApiErrorCode; message: string } };
```
Endpoints (all JSON, all except health and login require `Authorization: Bearer <jwt>`):
- `GET /api/health` -> `{ status: 'ok' }`
- `POST /api/auth/login` body `{ username, password }` -> `{ token, expiresAt, user: AuthUser }`
- `GET /api/auth/me` -> `{ user: AuthUser }`
- `GET /api/lists?refresh=0|1` -> `ListsPayload` (server memory cache 15s with in-flight de-dup; `refresh=1` bypasses but at most once per 5s)
- `POST /api/posters/fill` body `{ items: PosterFillItem[] }` (max 8) -> `PosterFillResult[]`
- `POST /api/picks/status` body `PickStatusRequest` -> `PickStatusResult` (404 `feature_disabled` when `FEATURE_PICKS !== 'true'`)

```ts
// "Poster fill" is the single enrichment endpoint (name kept for brevity): it fills any empty EnrichField.
export interface PosterFillItem { tab: TabId; title: string; year: number|null; because?: string; needs: EnrichField[] } // needs = fields EMPTY in the client's payload whose column exists and are not recently missed; never empty array
export interface PosterFillResult {
  tab: TabId; titleKey: string; becauseKey?: string;
  poster: string|null; creator: string|null; franchise: string|null; imdbRating: number|null; // values now stored in the sheet (null = not found / not written)
  written: Partial<Record<EnrichField, boolean>>;     // which fields were actually written
  missed: EnrichField[];                              // fields no provider could supply (client adds them to the 7-day miss cache)
  outcome: 'ok'|'partial'|'not_found'|'already_filled'|'provider_error'|'write_skipped'; detail?: string;
}
// Picks: status must be one of PICK_STATUS_OPTIONS[picksId]; '' only for undo. "Skip" never reaches the server.
export interface PickStatusRequest { picksId: PicksId; title: string; year: number|null; because: string; status: string; expectedCurrent: string }
export interface PickStatusResult { outcome: 'written'|'not_found'|'conflict'|'ambiguous'|'error'; currentValue?: string }
```

## 7. Auth design

Server (`server/auth/`):
```ts
export interface AuthUser { id: string; username: string }
export interface AuthProvider { authenticate(username: string, password: string): Promise<AuthUser | null> }
export class EnvAuthProvider implements AuthProvider {}  // single user from AUTH_USERNAME + AUTH_PASSWORD_HASH
export function getAuthProvider(): AuthProvider;          // the ONLY place that picks the implementation
// tokens.ts (jose, HS256, issuer 'my-lists', claims sub+username, exp from JWT_EXPIRES_IN)
export function signToken(user: AuthUser): Promise<{ token: string; expiresAt: string }>;
export function verifyToken(token: string): Promise<AuthUser | null>;
```
- `EnvAuthProvider.authenticate` ALWAYS runs `bcrypt.compare` (against a dummy hash when username mismatches) to equalize timing; returns `null` for either wrong field (same error text "Invalid username or password").
- `withAuth(handler)` wrapper in `server/http/withAuth.ts` reads Bearer token, attaches `ctx.user`, else 401.
- Login rate limit (`server/http/rateLimit.ts`): in-memory, 5 failures / 15 min per IP (best effort on serverless) + 400 ms delay on failure.
- Multi-user seam: `server/sheets/config.ts` exports `getSheetIdForUser(user: AuthUser): string` (returns `GOOGLE_SHEET_ID` now). Future DB provider implements `AuthProvider`; nothing else changes.

Client (`src/services/auth/`):
```ts
export interface AuthSession { token: string; expiresAt: string; user: AuthUser }
export interface AuthService {
  login(username: string, password: string): Promise<AuthSession>;
  logout(): void;
  getSession(): AuthSession | null;   // reads localStorage key 'ml.auth.v1', null if expired
  getToken(): string | null;
}
export const authService: AuthService; // localTokenAuthService
```
`apiFetch<T>(path, init?)` in `src/services/http/apiFetch.ts` attaches the token, unwraps `ApiResponse<T>`, throws `ApiError {code,status,message}`, and on 401 calls `authService.logout()` and dispatches `window` event `ml:unauthorized` (AuthProvider listens and redirects to `/login`). Token in localStorage by design (stay logged in on this device; XSS risk accepted for a single-user app; CSP set in `vercel.json` Step 24).

## 8. Theming and animation

### 8.1 Mechanism
- `src/themes/themes.css` defines CSS variables per `[data-theme="<id>"]` (ids: `home`, `movies`, `series`, `anime`, `games`, `books`, `other`). Variables: `--bg --surface --surface-2 --ink --ink-muted --accent --accent-2 --border --radius --shadow-card --font-display --font-body --ease --dur-fast --dur-base --dur-slow`.
- shadcn tokens are bound per theme (`--background: var(--bg)`, `--foreground: var(--ink)`, `--primary: var(--accent)`, `--card: var(--surface)`, `--border`, `--ring: var(--accent)`, `--radius`). `curious` uses `other`.
- `ThemeProvider({ themeId, children })` renders `<div data-theme={themeId} className="min-h-dvh bg-[var(--bg)] text-[var(--ink)] font-[var(--font-body)]">`. `ListPage` wraps itself with its list's theme; Home/My Lists use `home`.
- `src/themes/themeSpecs.ts` exports `THEME_SPECS: Record<ThemeId, ThemeSpec>` (same values in TS for motion + JS use):
```ts
export interface ThemeSpec { id: ThemeId; label: string; colors: {bg:string;surface:string;surface2:string;ink:string;inkMuted:string;accent:string;accent2:string;border:string}; fonts:{display:string;body:string}; radiusPx:number; motion: MotionSpec; cardStyle: string }
export interface MotionSpec { fast:number; base:number; slow:number; ease:[number,number,number,number]; spring:{stiffness:number;damping:number;mass:number}; stagger:number }
```

### 8.2 Theme specs (hex, fonts, motion, card style)
- **home**: bg `#0E0F13`, surface `#171921`, surface2 `#20232D`, ink `#F3F4F6`, muted `#9AA0AE`, accent `#7C9CFF`, accent2 `#FF9F6B`, border `#2A2E3A`. Fonts: display Inter Variable 700, body Inter Variable. Radius 16. Motion 180/280/450 ms, ease `[0.2,0,0,1]`. Cards: soft dark glass, 1px border, subtle top gradient.
- **movies (cinematic)**: bg `#0B0B0F`, surface `#14141B`, surface2 `#1C1C26`, ink `#F2EDE4`, muted `#8A8577`, accent `#D4AF37`, accent2 `#8B1E2D`, border `#2A2A33`. Fonts: display Bebas Neue (letter-spacing 0.06em, uppercase), body Inter Variable. Radius 6. Motion 200/360/700 ms, ease `[0.22,1,0.36,1]`, spring 170/26/1, stagger 40 ms. Cards: 2:3 poster, dark vignette gradient bottom (`linear-gradient(to top, #000000cc, transparent 55%)`), gold 1px hairline on hover, slow 1.04 scale on poster, subtle film grain overlay (SVG noise, opacity 0.06), 2.39:1 letterbox bars on list header.
- **series (cozy)**: bg `#2A1F1A`, surface `#3A2C24`, surface2 `#473529`, ink `#FBEFE0`, muted `#C9B29A`, accent `#F2A65A`, accent2 `#E07A5F`, border `#5A4636`. Fonts: display Fraunces Variable (soft, wonk 1), body Nunito Variable. Radius 22. Motion 220/350/550 ms, ease `[0.25,0.8,0.25,1]`, spring 140/18/1, stagger 50 ms. Cards: rounded 22px, warm drop shadow `0 10px 30px #00000055`, amber inner glow on hover, status chip as a small pill "ticket".
- **anime (bold playful)**: bg `#FFF4D6`, surface `#FFFFFF`, surface2 `#FFE9A8`, ink `#1B1B3A`, muted `#5B5B80`, accent `#FF4D8D`, accent2 `#22D3EE` (yellow `#FFD23F`, violet `#7C3AED` as sticker colors), border `#1B1B3A`. Fonts: display Bowlby One, body Poppins 500. Radius 14. Motion 160/250/400 ms, ease `[0.34,1.56,0.64,1]` (overshoot), spring 400/17/1, stagger 35 ms. Cards: 3px solid ink border, hard offset shadow `5px 5px 0 #1B1B3A`, cards rotated alternately -1.5deg/+1.5deg (0 on hover with bounce), status shown as sticker (rotate -4deg), halftone dot pattern header.
- **games (neon)**: bg `#07060F`, surface `#100E21`, surface2 `#1A1736`, ink `#E8E6FF`, muted `#8B86B8`, accent `#00F0FF`, accent2 `#FF2BD6` (lime `#B6FF3B` for "Completed"), border `#2B2760`. Fonts: display Orbitron Variable 800 uppercase, body Rajdhani 500. Radius 4 with clipped corner (`clip-path` 10px chamfer). Motion 120/180/320 ms, ease `[0.2,0.8,0.2,1]`, spring 300/30/1, stagger 25 ms. Cards: 1px accent border, glow `0 0 24px rgba(0,240,255,.45)` on hover, CRT scanline overlay (opacity 0.05), 120 ms flicker on mount (opacity 0.6→1 two steps).
- **books (calm paper)**: bg `#F4EBDD`, surface `#FBF6EC`, surface2 `#EFE3CF`, ink `#2E2A25`, muted `#7A6F62`, accent `#8C5A3C`, accent2 `#7A8B69`, border `#D9C9AE`. Fonts: display Lora Variable 600, body Source Serif 4 Variable. Radius 4 (book cover) / 10 (panels). Motion 260/500/800 ms, ease `[0.45,0,0.2,1]`, spring 90/20/1, stagger 60 ms. Cards: book-cover 2:3 with left "spine" gradient (`linear-gradient(90deg,#00000033,transparent 8%)`), paper texture (SVG noise 0.04), drop shadow `0 6px 14px #5a4a3a33`, gentle fade-rise only (no bounce).
- **other / curious (simple)**: bg `#111418`, surface `#1A1F26`, surface2 `#232A33`, ink `#E6EAF0`, muted `#8B95A5`, accent `#5EEAD4`, accent2 `#A78BFA`, border `#2B333E`. Fonts Inter Variable. Radius 10. Motion 150/240/400 ms, ease `[0.2,0,0,1]`.

### 8.3 Animation guidelines
- Animate only `transform` and `opacity` (plus `filter` on hover sparingly). Never animate width/height/top/left. `layout` prop only on small sets (<= 12 elements) and the SplitView.
- Tokens in `src/themes/motion.ts`: `export const DUR = {instant:0.1, fast:0.18, base:0.28, slow:0.45}`, `export const EASE = {standard:[0.2,0,0,1], emphasized:[0.22,1,0.36,1], bounce:[0.34,1.56,0.64,1]}`, presets `fadeUp`, `fadeIn`, `scaleIn`, `staggerContainer(stagger)`, `cardHover`, `tapScale = 0.97`.
- Page transition (`PageTransition`): 220 ms, opacity 0->1 and y 8->0; exit 120 ms opacity->0. `AnimatePresence mode="wait"` keyed by `location.pathname` (not query string).
- Lists/grids: stagger children max the first 12 items (`delay = min(i,12)*spec.stagger`); items beyond 12 render with no animation.
- Wrap the app in `<MotionConfig reducedMotion="user">`; CSS `@media (prefers-reduced-motion: reduce)` disables shimmer/flicker/grain.
- Skeleton shimmer: 1.4 s linear loop, theme `--surface-2`. CountUp: 600 ms easeOut. Swipe/drag: commit at offset > 120 px or velocity > 500 px/s, otherwise spring back (stiffness 300, damping 28).
- Mobile: use `100dvh`, `env(safe-area-inset-*)` padding, touch targets >= 44 px, `touch-action: pan-y` on horizontal carousels, `overscroll-behavior: contain` on drawers.

## 9. Phase 1 build steps (24 steps, one prompt each)

Standard "verify" for every step: `npm run typecheck`, `npm run lint`, `npm run test` all green, and the step checklist. "Do not touch" always also includes `.env`, `PLAN.md`, and any file not listed.

### Step 1: Scaffold, git, env template
- Create/edit: run `npm create vite@latest my-lists -- --template react-ts` into the project folder (it already contains PLAN.md and `.cursor/` — keep them; scaffold in a temp subfolder and move files if the tool refuses a non-empty dir). `git init`, `.gitignore`, `.env.example` (section 5), `docs/SETUP.md` (section 5 steps), `docs/DECISIONS.md`, install deps from section 2 (not shadcn yet), `package.json` scripts, `tsconfig.api.json`, `vitest.config.ts`, `src/test/setup.ts`.
- `.gitignore` must include: `node_modules`, `dist`, `.env`, `.env.*` except `!.env.example`, `.vercel`, `*.log`, `.DS_Store`, `coverage`, any `*service-account*.json`, `*-key.json`.
- Scripts: `dev` = `concurrently -k -n web,api "npm:dev:web" "npm:dev:api"`, `dev:web` = `vite`, `dev:api` = `tsx watch scripts/dev-api.ts`, `build` = `tsc -b && vite build`, `typecheck` = `tsc -b --noEmit`, `lint` = `eslint .`, `test` = `vitest run`, `hash` = `tsx scripts/hash-password.ts`, `check-sheet` = `tsx scripts/check-sheet.ts`.
- `tsconfig.api.json`: includes `api`, `server`, `scripts`, `src/types`, `src/lib`; `module: ESNext`, `moduleResolution: bundler`, `strict: true`; add to root `references`.
- Do not touch: `PLAN.md`, `.cursor/`.
- Checklist: [ ] `git status` clean after first commit [ ] `.env` is ignored (`git check-ignore .env` prints it) [ ] `npm run dev:web` serves the Vite page [ ] `npm run typecheck` passes [ ] `.env.example` has every var from section 5 and no real values.

### Step 2: Tailwind v4, shadcn, alias
- Create/edit: `vite.config.ts` (plugins `react()`, `tailwindcss()`; alias `@` -> `src`; dev proxy `/api` -> `http://localhost:3001`), `src/index.css` (`@import "tailwindcss"; @import "tw-animate-css";`), `components.json`, `src/lib/utils.ts` (`cn`), `src/components/ui/*` via CLI (list in section 2), `tsconfig.app.json` paths `@/*`, `src/App.tsx` (temporary page with a Button, Input, Skeleton, Sonner `<Toaster/>`).
- Do not touch: `server/`, `api/`.
- Checklist: [ ] page shows a styled shadcn button [ ] `@/components/ui/button` import works in TS and Vite [ ] `npm run build` succeeds.

### Step 3: Types, constants, pure helpers + tests
- Create: `src/types/{lists,media,picks,api,auth,theme,index}.ts` exactly as in sections 4 and 6; `src/types/picks.ts` contains the constants below; `src/lib/{normalize,dates,rating,storage}.ts`; tests `src/lib/__tests__/*.test.ts`.
```ts
// src/types/picks.ts
// Statuses the app may WRITE to a picks tab (identical to the target main tab's own status words).
export const PICK_STATUS_OPTIONS: Record<PicksId, readonly string[]> = {
  'movies-picks': ['Want to','Must watch','Maybe','Watched'],
  'series-picks': ['Want to','On hold','Maybe later','Watched'],
  'games-picks':  ['Want to','Played','Completed','On hold'],
};
// Gesture shortcuts only; every option is also a button. Left swipe is always Skip.
export const PICK_SWIPE_MAP: Record<PicksId, { right: string; up: string }> = {
  'movies-picks': { right: 'Want to', up: 'Watched' },
  'series-picks': { right: 'Want to', up: 'Watched' },
  'games-picks':  { right: 'Want to', up: 'Played' },
};
// 'skip' is LOCAL ONLY (session hide). It is never sent to the API and never written to the sheet.
export type PickAction = { type: 'status'; status: string } | { type: 'skip' };
export const PICKS_SKIPPED_KEY = 'ml.picksSkipped.v1'; // sessionStorage: string[] of PickItem.id
```
- Signatures: `normalizeTitle(s:string):string`, `normalizeKey(s:string):string`, `parseYear(v:unknown):number|null`, `parseUpdatedAt(v:unknown):string|null`, `serialToIso(n:number):string`, `parseRating(v:unknown):number|null`, `effectiveRating(i):number|null`, `externalRatingLabel(listId):string`, `splitGenres(v:unknown):string[]`, `sanitizePosterUrl(v:unknown):string|null`, `statusGroupOf(s:string):StatusGroup`, `readJson<T>(key:string,fallback:T):T`, `writeJson(key:string,v:unknown):void` (try/catch quota).
- Do not touch: UI files.
- Checklist: [ ] tests cover: `"Léon: The Professional"`→`leon the professional`, `"Tom & Jerry"`→`tom and jerry`, serial 45000→`2023-03-15`, ratings `"4/5"`→8, `"80%"`→8, `"abc"`→null, `"8,1"`→8.1, `"N/A"`→null, `11`→null, `effectiveRating({myRating:null,imdbRating:7.4})`→7.4 and `{myRating:9,imdbRating:7.4}`→9, genres `"Action, sci-fi / Drama"`→`["Action","Sci-fi","Drama"]`, `http://` poster → null [ ] a test asserts every value in `PICK_STATUS_OPTIONS[p]` exists in `STATUSES[PICKS_TARGET[p]]` and that no option equals `'Skip'` [ ] `externalRatingLabel('anime')==='MAL'` [ ] no React/DOM imports in `src/lib` or `src/types`.

### Step 4: Serverless foundation + local API runner
- Create: `server/config/env.ts`, `server/http/{respond,errors,types,rateLimit}.ts`, `api/health.ts`, `scripts/dev-api.ts`, `vercel.json` (`{"rewrites":[{"source":"/((?!api/).*)","destination":"/index.html"}],"functions":{"api/**/*.ts":{"maxDuration":30}}}`).
- `api/*.ts` pattern: `import type { VercelRequest, VercelResponse } from '@vercel/node'; export default async function handler(req, res) { ... }` delegating to `server/**` (relative imports with `.js` extension).
- `scripts/dev-api.ts`: loads `.env` via dotenv, starts `node:http` on `API_DEV_PORT`, maps `/api/foo/bar` to dynamic `import('../api/foo/bar.ts')`, shims `req.query`, `req.body` (parsed JSON), `res.status(n).json(x)`, `res.setHeader`.
- Helpers: `ok<T>(res, data)`, `fail(res, code, message, status)`, `methodGuard(req,res,['GET'])`.
- Do not touch: `src/`.
- Checklist: [ ] `npm run dev:api` then `curl http://localhost:3001/api/health` returns `{"ok":true,"data":{"status":"ok"}}` [ ] via Vite `http://localhost:5173/api/health` works (proxy) [ ] missing env var error lists names, not values [ ] wrong method returns 405 `bad_request`.

### Step 5: Auth server
- Create: `server/auth/{AuthProvider,EnvAuthProvider,tokens,index}.ts`, `server/http/withAuth.ts`, `api/auth/login.ts`, `api/auth/me.ts`, `scripts/hash-password.ts` (`npm run hash -- "pw"` prints a bcrypt hash cost 12, with the single-quote reminder), tests in `server/auth/__tests__/`.
- Do not touch: `src/`, sheets code.
- Checklist: [ ] unit tests: correct creds → user; wrong password/username → null; expired/garbage token → null [ ] `POST /api/auth/login` returns token for correct creds, 401 `unauthorized` with identical message for wrong ones [ ] `GET /api/auth/me` without token → 401, with token → user [ ] 6th failed login in 15 min → 429 `rate_limited` [ ] no log line ever prints password, hash, or token.

### Step 6: Auth client + router skeleton
- Create: `src/services/http/apiFetch.ts`, `src/services/auth/{AuthService,localTokenAuthService}.ts`, `src/features/auth/{AuthContext,AuthProvider,RequireAuth,LoginPage}.tsx`, `src/router.tsx`, `src/components/layout/AppShell.tsx`; edit `src/main.tsx`, `src/App.tsx`.
- Routes (createBrowserRouter): `/login`, `/` (placeholder Home), `/lists`, `/lists/:listId`, `/picks`, `*` NotFound. All except `/login` wrapped in `RequireAuth`.
- `AuthContext` value: `{ user: AuthUser|null; status: 'checking'|'authenticated'|'anonymous'; login(u,p): Promise<void>; logout(): void }`. On mount, if a stored session exists, call `/api/auth/me` to validate.
- LoginPage: centered shadcn card, username/password fields, inline error, disabled while submitting, `autoComplete` attributes set.
- Do not touch: `server/`, `api/`.
- Checklist: [ ] unauthenticated visit to `/` redirects to `/login` [ ] correct login lands on `/` and survives page refresh and browser restart [ ] wrong login shows an error, no token stored [ ] deleting the token in DevTools + refresh returns to `/login` [ ] `ml:unauthorized` event after a forced 401 logs out.

### Step 7: Sheets client + header mapping (server, pure)
- Create: `server/sheets/{client,headers,mapping,rowKey,config}.ts`, `src/test/fixtures/sheetValues.ts`, tests `server/sheets/__tests__/{headers,mapping}.test.ts`.
- `client.ts`: `createSheetsClient(env): SheetsClient` using `@googleapis/sheets` JWT auth with scope `https://www.googleapis.com/auth/spreadsheets`; retries 429/5xx up to 3 times with exponential backoff (500 ms, 1 s, 2 s + jitter).
- `mapping.ts` exports `mapMainTab(listId: ListId, values: unknown[][]): { items: MediaItem[]; warnings: SheetWarning[]; columns: Record<EnrichField, boolean> }` and `mapPicksTab(picksId: PicksId, values: unknown[][]): { items: PickItem[]; warnings: SheetWarning[]; columns: Record<EnrichField, boolean> }` (picks: only `poster` can be true). `columns[f]` is true iff the header for that field exists in the tab.
- `rowKey.ts`: `makeItemId(listId,titleKey,year,dupIndex)`.
- Do not touch: `src/`, `api/`, write code.
- Checklist: [ ] tests: headers in different order, extra unknown column → `extra`, missing My Rating / IMDb Rating columns → both `null` with no crash and `columns.imdbRating === false`, headers `My Rating` and legacy `Rating` → `myRating`, header `IMDb Rating` → `imdbRating` (never confused with `Rating`), numeric cell `8.1` → 8.1, `"N/A"` → null, `Director/Creator` and legacy `Director` both map to `creator`, missing Title → warning + empty array, duplicate titles → ids `~2`, Updated-at serial and `dd/mm/yyyy` parse, blank rows skipped [ ] `client.ts` exports no function other than `batchGetValues`/`batchUpdateValues` (assert in a test by `Object.keys`).

### Step 8: `readAll` + `/api/lists` + diagnostic script
- Create: `server/sheets/{readAll,cache}.ts`, `api/lists.ts`, `scripts/check-sheet.ts`, test `server/sheets/__tests__/readAll.test.ts` (fake client).
- `readAll(client): Promise<ListsPayload>` issues ONE `batchGetValues` for all 10 tabs with ranges `'<Tab>'!A1:Z3000` (a consistent snapshot); a missing tab yields a `missing_tab` warning, not an error. `dataHash` = sha1 of `JSON.stringify({lists,picks})`.
- `cache.ts`: `getCachedLists(loader, {ttlMs:15000, force:boolean})` with in-flight promise de-dup and a 5 s minimum interval for forced refresh.
- `check-sheet.ts`: prints per tab: rows found, detected column map, warnings, columns missing, and per enrichment field (poster, creator, franchise, imdbRating) how many rows are still empty (= how many external lookups would happen).
- `readAll` and everything under `server/sheets/read*` must NOT import `server/images/*` (a test greps the import graph).
- Do not touch: `src/`, write code.
- Checklist: [ ] with real credentials `npm run check-sheet` prints all 10 tabs [ ] `GET /api/lists` returns counts matching the sheet [ ] two concurrent requests trigger one Sheets API call (test) [ ] `GET /api/lists` makes zero calls to TMDB/OMDb/RAWG/Jikan/Open Library (test with a fetch spy that fails on any non-Google host) [ ] renaming a tab in the sheet yields a warning, not a 500.

### Step 9: Client data layer
- Create: `src/services/sheets/{listsApi,listsCache}.ts`, `src/features/data/{useLists,selectors}.ts`, `src/components/common/{Skeletons,ErrorState,EmptyState}.tsx`; edit `src/main.tsx` (QueryClientProvider), `src/App.tsx`.
- `fetchLists(opts?: {refresh?: boolean}): Promise<ListsPayload>`. `useLists()` = React Query `['lists']`, `staleTime: 60_000`, `gcTime: Infinity`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, `retry: 2`, `placeholderData`/`initialData` from `listsCache.load()` (localStorage key `ml.lists.v1`, saved after each success, ignored if > 7 days or schema mismatch). Return `{ data, isLoading, isFetching, error, refetch, updatedAt }`.
- Selectors: `getList(payload, id)`, `getPicks(payload, id)`, `listCounts(payload): Record<ListId, number>`, `allItems(payload): MediaItem[]`.
- Temporary debug on `/`: counts per list.
- Do not touch: `server/`, themes.
- Checklist: [ ] first load shows skeletons then counts [ ] second load paints instantly from cache then silently refreshes [ ] edit a cell in the sheet, refocus the tab → counts/data update within one refetch [ ] kill the API → cached data still shows plus a non-blocking error toast.

### Step 10: Theme foundation + motion tokens + page transitions
- Create: `src/themes/{themes.css,themeSpecs,motion,fonts,ThemeProvider}.ts(x)`, `src/components/layout/{PageTransition,TopBar,BottomNav}.tsx`, `src/hooks/{useMediaQuery,useLocalStorage}.ts`; edit `src/index.css` (import themes.css), `src/router.tsx` (wrap outlet in `PageTransition`), `src/main.tsx` (`MotionConfig`).
- Values come from section 8.2 verbatim. `fonts.ts` imports the fontsource CSS for all fonts. Provide `useTheme()` returning the current `ThemeSpec`.
- `TopBar`: back button (when not on `/`), title, Refresh button (calls `refetch`), logout menu. `BottomNav` (mobile only, <768px): Home, My Lists, Picks (hidden if flag off).
- Do not touch: `server/`, features/lists.
- Checklist: [ ] a dev-only `/_theme` route (removed in Step 24) renders 7 swatch blocks that visibly switch fonts/colors/radius [ ] route change fades 220 ms [ ] with OS "reduce motion" on, no transitions [ ] no layout shift when fonts load (`font-display: swap` + fallback stack).

### Step 11: Shared UI primitives
- Create: `src/components/common/{StatusChip,PosterImage,PosterFallback,CountUp}.tsx`.
- Props:
```ts
StatusChip({ status: string; group?: StatusGroup; size?: 'sm'|'md' })     // color by group: done=green, active=accent, planned=blue, maybe/unknown=muted, waiting=amber, paused=slate, dropped=red; uses theme tokens where possible
PosterImage({ src: string|null; alt: string; title: string; aspect?: '2/3'|'1/1'; className?: string; priority?: boolean }) // lazy <img>, onError -> PosterFallback, fade-in 280 ms, reserved aspect ratio
PosterFallback({ title: string; kind: MediaKind; className?: string }) // gradient tile using first letters + kind icon (lucide)
CountUp({ value: number; durationMs?: number }) // 600 ms default, instant under reduced motion
```
- Do not touch: data layer, server.
- Checklist: [ ] debug page renders chips for every status in `STATUSES` and for an unknown status [ ] broken image URL shows fallback without layout jump [ ] `loading="lazy"` and `decoding="async"` set [ ] chips legible in all 7 themes (contrast >= 4.5:1).

### Step 12: Global search + Home
- Create: `src/features/search/{searchIndex,useGlobalSearch}.ts`, `src/features/home/{HomePage,GlobalSearch,SearchResultRow}.tsx`; edit `src/router.tsx` to use HomePage.
- Search index (Fuse 7.5):
```ts
export type SearchSource = { kind: 'item'; item: MediaItem } | { kind: 'pick'; item: PickItem };
export interface SearchHit { id: string; source: SearchSource; listId: ListId; score: number }
export interface SearchIndex { fuse: Fuse<SearchSource>; size: number }
export function buildSearchIndex(payload: ListsPayload): SearchIndex;           // all 7 lists + 3 picks tabs
export function searchIndex(index: SearchIndex, query: string, limit?: number): SearchHit[]; // limit default 20
```
Fuse options: `keys:[{name:'item.title',weight:0.7},{name:'item.franchise',weight:0.15},{name:'item.creator',weight:0.1},{name:'item.genres',weight:0.05}]`, `threshold:0.35`, `ignoreLocation:true`, `ignoreDiacritics:true`, `minMatchCharLength:2`, `includeScore:true`. Queries < 2 chars return `[]`. Index rebuilt with `useMemo` keyed on `payload.dataHash`. Input uses `useDeferredValue` (no debounce delay).
- `SearchResultRow({ hit: SearchHit; onSelect(): void })`: 40x60 thumb, title, year, list label chip (e.g. "Movies"), `StatusChip` showing status (e.g. "Watched"/"Played"; empty status shows "No status"); for picks sources show a violet chip "In picks" plus the pick status, or "No status" when blank. Selecting a row navigates to `/lists/<listId>?q=<title>` (for picks: `/picks` target list is wired in Step 23; until then to `/lists/<targetList>?q=`).
- HomePage layout: logo/greeting, giant search input (autofocus on desktop only, `inputMode="search"`, clear button), results list (max 20, animated in with `fadeUp`, first 12 staggered), buttons "My Lists" (primary, -> `/lists`) and "Add" (`disabled`, `aria-disabled`, tooltip "Coming in phase 2"), plus a small "Picks" link when the flag is on.
- Do not touch: `server/`, other features.
- Checklist: [ ] typing "inceptoin" still finds "Inception" [ ] results show list + status instantly, no spinner after data is loaded [ ] an item present in both Movies and Movies picks appears twice, picks one labelled "In picks" [ ] Books, Other, Curious items are searchable [ ] "Add" is visibly disabled and not focusable-activatable [ ] search of ~1k items feels instant (no dropped frames while typing) [ ] unit test `searchIndex` with a fixture payload.

### Step 13: My Lists page (cards + mobile carousel)
- Create: `src/features/lists/{MyListsPage,ListCategoryCard,ListCarousel}.tsx`; edit router.
- `ListCategoryCard({ listId: 'movies'|'series'|'anime'|'games'|'books'; count: number; posters: string[]; to: string; variant: 'tile'|'fullscreen' })`: artwork = collage of up to 4 posters (choose items with a poster, prefer higher `effectiveRating`; deterministic, no randomness) skewed/stacked with the list's theme gradient, big display-font title, count, and a status mini-bar. Each card is styled with ITS OWN theme spec (use `THEME_SPECS[listId]` via a local `data-theme` wrapper).
- Desktop/tablet (>= 768px): responsive grid of 5 tiles (2 cols tablet, 3 cols desktop), hover: tilt `rotateX/Y` max 6deg + lift. Mobile (< 768px): `ListCarousel` using `embla-carousel-react` — full-screen cards (`h-[calc(100dvh-<topbar>-<bottomnav>)]`), horizontal swipe with snap, dot indicators, tap opens list. Below the carousel/grid, two small text links "Other" and "Curious".
- Do not touch: search, server.
- Checklist: [ ] on a 390x844 viewport each card fills the screen and swipes with momentum [ ] tapping a card navigates to `/lists/<id>` [ ] posters missing → fallback collage using `PosterFallback` [ ] counts match Step 9 counts [ ] no horizontal page scroll on mobile.

### Step 14: List page shell, grid and table views
- Create: `src/features/lists/{ListPage,ListHeader,ViewToggle}.tsx`, `src/features/lists/views/{PosterGrid,PosterCard,ListTable}.tsx`, `src/hooks/useInfiniteChunks.ts`; edit router (`/lists/:listId`: validate against `LIST_IDS` else NotFound; `other`/`curious` render the simple list placeholder until Step 18).
- Props: `PosterGrid({ items: MediaItem[]; listId: ListId })`, `PosterCard({ item: MediaItem; index: number; variant?: 'default' })` (variant components arrive in Steps 16-17), `ListTable({ items: MediaItem[]; listId: ListId })` (sticky header; columns: Title, Status, Year, Genre, Creator, My Rating, `<externalRatingLabel(listId)> Rating` (e.g. "IMDb Rating", "MAL Rating"), Updated; Platform column only for games; hides Genre/Creator/Updated below 640px; both rating columns stay visible, null shown as "–"), `ViewToggle({ value: 'grid'|'table'; onChange(v): void })` (shadcn ToggleGroup; persisted per list in localStorage `ml.view.<listId>`).
- `useInfiniteChunks<T>(items: T[], chunk=60): { visible: T[]; sentinelRef: RefObject<HTMLDivElement>; hasMore: boolean }` using IntersectionObserver.
- Grid: CSS grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`, gap 12px; card shows poster, status chip overlay, title, year and a `RatingBadge`; tap/click opens a `Sheet` detail drawer (title, year, genres, why, creator, franchise, status, updated, platform for games, and BOTH ratings: "My rating 9" filled star in accent color, and "<IMDb|MAL|Metacritic|Open Library> 8.1" muted; absent values show "–"). New shared component `src/components/common/RatingBadge.tsx`: `RatingBadge({ myRating: number|null; externalRating: number|null; externalLabel: string; size?: 'sm'|'md' })` — shows My Rating prominently (★ 9) and the external one small (IMDb 8.1); renders nothing when both are null. Add `RatingBadge` to the files created in this step. The wrapper applies `ThemeProvider themeId={listId}`.
- Loading: skeleton grid of 12 cards. Empty: `EmptyState`. Error: `ErrorState` with retry.
- Do not touch: server, search, themes values.
- Checklist: [ ] cards and drawer show My Rating and the external rating separately and correctly labelled per list; one missing rating never hides the other [ ] each list opens with its theme colors/fonts [ ] toggle swaps grid ↔ table and remembers choice after refresh [ ] 500-item list scrolls smoothly, rendering 60 at a time [ ] items without posters show fallback tiles (no empty boxes) [ ] detail drawer opens/closes, closable by swipe on mobile.

### Step 15: Filters, sort, URL state (pure logic first)
- Create: `src/features/lists/filters/{listQuery,applyListQuery,filterConfig,FilterBar}.ts(x)`, `src/features/lists/SortMenu.tsx`, tests `src/features/lists/filters/__tests__/*.test.ts`; edit `ListPage.tsx`.
```ts
// 'rating' sorts by effectiveRating (myRating ?? imdbRating); 'myRating' and 'imdbRating' sort by that column alone. Nulls always last.
export type SortKey = 'title'|'year'|'rating'|'myRating'|'imdbRating'|'updated'|'status';
export type RatingBy = 'best'|'my'|'external';  // which rating ratingMin applies to; default 'best' = effectiveRating
export interface ListQuery { view:'grid'|'table'; sort:SortKey; dir:'asc'|'desc'; q:string; statuses:string[]; genres:string[]; yearMin:number|null; yearMax:number|null; franchise:string|null; creator:string|null; platform:string|null; ratingMin:number|null; ratingBy:RatingBy; smart:string|null }
export const DEFAULT_QUERY: ListQuery; // sort 'updated' desc, view 'grid'
export function parseListQuery(sp: URLSearchParams): ListQuery;
export function serializeListQuery(q: ListQuery): URLSearchParams;   // omits defaults; arrays comma-joined
export function applyListQuery(items: MediaItem[], q: ListQuery, ctx: { now: Date }): MediaItem[]; // filter then stable sort; nulls last
export interface FilterConfig { statuses: readonly string[]; show: { genre:boolean; year:boolean; franchise:boolean; creator:boolean; platform:boolean; rating:boolean }; creatorLabel: string }
export const FILTER_CONFIG: Record<ListId, FilterConfig>;
```
Context-specific: movies creatorLabel "Director" (+franchise); series "Creator" (+franchise); anime "Studio/Creator" (+franchise); games "Developer" + platform + franchise; books "Author" + franchise labelled "Series"; statuses chips come from `STATUSES[listId]` (books: statuses derived from data). Filter option lists (genres, franchises, creators) are derived from the current list's data, sorted by frequency.
- UI: `FilterBar({ listId, items, query, onChange })` — a horizontal chip row (status multi-select chips), plus a "Filters" button opening a shadcn `Sheet` (bottom on mobile) with genre multi-select (Command), year range (Slider), franchise/creator/platform selects (Command with search), min rating slider 0–10 plus a 3-way toggle "Best / Mine / <externalRatingLabel>" (`ratingBy`); `SortMenu` lists Title, Year, Rating (best), My Rating, `<label> Rating`, Updated, Status; "Clear all". Active filter count badge. URL is the source of truth via `useSearchParams` (`replace: true` while typing).
- Do not touch: server, theme values, views internals.
- Checklist: [ ] unit tests: multi-status OR within a field, AND across fields, year range inclusive, null year excluded only when a range is set, sort stable with nulls last, `ratingBy=best` falls back to IMDb when My Rating is null, `ratingBy=my` excludes rows without My Rating, sort `rating` desc orders effective values 8 (IMDb only), 6 (My Rating only), 5 (IMDb only) correctly, and a row with My Rating 6 and IMDb 9 sorts as 6 [ ] refresh keeps filters; browser Back leaves list [ ] Games shows a Platform filter; Movies shows Director; Books shows Author [ ] filtering 500 items < 16 ms (measure in a test with a console.time assertion-free log).

### Step 16: Stats header + smart views (incl. Marvel split)
- Create: `src/features/lists/stats/computeStats.ts`, `src/features/lists/{ListStatsHeader}.tsx`, `src/features/lists/smart/{smartViews.ts,SmartViewChips.tsx}`, `src/features/lists/views/SplitView.tsx`, tests; edit `ListPage.tsx`.
```ts
export interface ListStats { total:number; byGroup:Record<StatusGroup,number>; byStatus:Record<string,number>; avgMyRating:number|null; myRatedCount:number; avgExternalRating:number|null; externalRatedCount:number; topGenres:{genre:string;count:number}[]; posterCoverage:number; lastUpdated:string|null }
export function computeStats(items: MediaItem[]): ListStats;
export interface SmartViewDef { id:string; label:string; apply(items:MediaItem[], ctx:{now:Date}): MediaItem[]; split?: { leftLabel:string; rightLabel:string; left(i:MediaItem):boolean; right(i:MediaItem):boolean } }
export const SMART_VIEWS: Record<ListId, SmartViewDef[]>;
```
- `ListStatsHeader({ stats, listId })`: total (CountUp), segmented status bar (animated width via `scaleX` transform origin-left), "My avg 8.2 (34 rated)" and "<label> avg 7.6 (210)", top 3 genres, "updated N days ago". Collapses to one compact row on mobile.
- Smart views: movies = `nolan` (creator normalized equals `christopher nolan`), `marvel` (split: franchise normalized contains `marvel`; left = statusGroup `done`, right = `planned` or `active`), `top-rated` (`effectiveRating >= 8`, i.e. My Rating when present, else IMDb Rating; sort by effective rating desc; define `TOP_RATED_MIN = 8` once and reuse in every list), `recent` (updatedAt within 30 days, else newest 20), `must-watch` (status `Must watch`); series = `watching` (active), `waiting` (waiting group), `rewatch` (`Rewatch from start`), `top-rated`, `recent`; anime = `watching`, `next-season-out` (status `Next season out`), `top-rated`, `recent`; games = `playing`, `backlog` (`Want to`), `completed`, `top-rated`, `recent`; books = `reading` (active), `top-rated`, `recent`; `other`/`curious` = `[]`. Pinned names/franchises live in constants at the top of `smartViews.ts` (`PINNED_DIRECTORS = ['Christopher Nolan']`, `PINNED_FRANCHISES = ['Marvel']`).
- `SmartViewChips` horizontally scrollable pills (`smart` in the URL); selecting one applies BEFORE other filters; `SplitView({ items, view: SmartViewDef, listId })` renders two columns (stacked on mobile) with animated counts.
- Do not touch: server, other features.
- Checklist: [ ] tests for each smart view with a fixture (Nolan matches `Christopher Nolan`, not `Nolan Bushnell`... use exact normalized equality) [ ] Marvel split shows watched left, want right, counts correct [ ] stats update live when filters change? (stats always reflect the whole list, NOT filtered — verify) [ ] averages ignore null ratings and My/external averages are computed independently [ ] `top-rated` fixture: row {my 9, imdb 5} included, row {my null, imdb 8.4} included, row {my 6, imdb 9.5} EXCLUDED (My Rating wins), row {null, null} excluded.

### Step 17: Theme-specific cards — Movies and Series
- Create: `src/features/lists/cards/{MovieCard,SeriesCard}.tsx`; edit `PosterCard.tsx` to dispatch by `listId` to card variants (default fallback keeps working), `src/themes/themes.css` (add only `[data-theme="movies"]`/`series` utility classes: `.grain`, `.vignette`, `.ticket-chip`).
- Both implement `PosterCardProps` identical to `PosterCard` and both render the shared `RatingBadge` (My Rating + external rating) in a theme-appropriate position (Movies: gold bottom-left over the vignette; Series: amber pill). Follow section 8.2 exactly for colors/motion/card style. Movies list header: 2.39:1 letterbox bars + gold display title. Series header: warm gradient with soft blurred poster backdrop.
- Do not touch: logic files (`applyListQuery`, `smartViews`), other lists' cards.
- Checklist: [ ] side by side, Movies reads dark/cinematic and Series warm/cozy at 390 px and 1280 px [ ] hover/tap animations use only transform/opacity [ ] text contrast >= 4.5:1 [ ] with reduced motion no scale/stagger.

### Step 18: Theme-specific cards — Anime, Games, Books (+ Other/Curious simple list)
- Create: `src/features/lists/cards/{AnimeCard,GameCard,BookCard}.tsx`, `src/features/lists/SimpleListPage.tsx`; edit `PosterCard.tsx` dispatch, `themes.css` (`.halftone`, `.scanlines`, `.paper`, `.spine`, `.chamfer`), router for `other`/`curious`.
- Per section 8.2. All three cards render `RatingBadge` (My Rating + external: MAL for anime, Metacritic for games, Open Library for books). Anime header: halftone pattern + sticker status chips (rotated). Games header: scanlines + neon underline; `Platform` shown as a small tag on each card. Books header: paper texture, serif title, soft fade-rise (no bounce), book-cover cards with spine shadow, author line under title.
- `SimpleListPage({ listId: 'other'|'curious' })`: single column list rows (title, status chip if present, `extra` key/values as muted text), a search-in-list input (Fuse local), no posters, no grid toggle, still themed `other`, uses the same loading/error/empty components.
- Do not touch: Movies/Series cards, logic files.
- Checklist: [ ] each of 5 lists is instantly distinguishable at a glance [ ] Games neon glow doesn't cause scroll jank on mobile (no more than 12 glowing elements animate at once) [ ] Books has no bounce/spring anywhere [ ] Other/Curious render all rows incl. rows whose columns differ from main tabs [ ] items from Books/Other/Curious appear in Step 12 search and deep-link into these pages with `?q=`.

### Step 19: Image providers (server, mocked tests)
- Create: `server/images/{types,throttle,match,tmdb,omdb,rawg,jikan,openLibrary,resolve}.ts`, tests `server/images/__tests__/*.test.ts` (stub global `fetch` with `vi.stubGlobal`; no network in tests). Add `OMDB_API_KEY` to the zod env schema (required only when movies/series lookups run; missing key → imdbRating simply not supplied for those, with a one-time warning).
```ts
export interface PosterLookup { title: string; year: number|null; need: EnrichField[] } // `need` = ONLY the fields still empty; providers must not fetch anything else
export interface PosterMatch {
  poster?: string; creator?: string; franchise?: string;
  imdbRating?: number;     // 0..10, 1 decimal, already normalized (see mapping below)
  sourceId: string; confidence: number;
}
export interface PosterProvider { id:'tmdb'|'rawg'|'jikan'|'openlibrary'; lookup(q: PosterLookup, signal?: AbortSignal): Promise<PosterMatch|null> }
export function providerFor(tab: TabId): PosterProvider | null;   // movies/movies-picks->tmdb(movie)+omdb, series/series-picks->tmdb(tv)+omdb (composite provider: TMDB match, then OMDb rating), anime->jikan, games/games-picks->rawg, books->openLibrary, other/curious->null
export class Throttle { constructor(minIntervalMs: number); run<T>(fn: () => Promise<T>): Promise<T> } // serial, spaced, retries on 429 honoring Retry-After (max 2)
export function scoreMatch(wanted: PosterLookup, candidate: { title: string; year: number|null }): number; // 0..1: normalized-title equality 0.7, containment 0.45, year equal +0.3 / off by 1 +0.15 / off by >1 -0.3
export const MIN_CONFIDENCE = 0.6;
```
- Endpoints and field mapping (call ONLY what `need` requires; every extra call is skipped when its field is not in `need`):
  - TMDB movies: `GET https://api.themoviedb.org/3/search/movie?query=&year=` (always, it finds the match), header `Authorization: Bearer ${TMDB_READ_TOKEN}`; poster = `https://image.tmdb.org/t/p/w500${poster_path}`. Only if `creator` or `franchise` or `imdbRating` is in `need`: `GET /movie/{id}?append_to_response=credits,external_ids` → creator = crew job `Director`, franchise = `belongs_to_collection.name` minus trailing ` Collection`, `external_ids.imdb_id` (e.g. `tt0816692`).
  - TMDB series: `/search/tv?query=&first_air_date_year=`; details `GET /tv/{id}?append_to_response=external_ids` → creator = `created_by[0].name`, `external_ids.imdb_id`.
  - OMDb (movies/series imdbRating only, `server/images/omdb.ts`): if an `imdb_id` is known `GET https://www.omdbapi.com/?i=<imdb_id>&apikey=${OMDB_API_KEY}`, else fallback `GET https://www.omdbapi.com/?t=<title>&y=<year>&type=movie|series&apikey=...`; rating = `parseFloat(imdbRating)` (`"N/A"` → none). Throttle 250 ms; free tier ~1,000/day so never call it when `imdbRating` is not in `need`. Response `Response:"False"` → no rating, not an error.
  - RAWG games: `GET https://api.rawg.io/api/games?search=&page_size=5&key=` → poster = `background_image`; rating = `metacritic / 10` when `metacritic` is a number, else `rating * 2` only when `ratings_count >= 20`, rounded to 1 decimal. RAWG `search` result already contains these, so no extra call.
  - Jikan anime: `GET ${JIKAN_BASE_URL}/anime?q=&limit=5&sfw=true` → poster = `images.jpg.large_image_url`, creator = `studios[0].name`, rating = `score` (MyAnimeList, already 0–10, 1–2 decimals → round to 1). One call supplies all three.
  - Open Library books: `GET https://openlibrary.org/search.json?title=&limit=5&fields=title,first_publish_year,cover_i,author_name,ratings_average,ratings_count` → poster = `https://covers.openlibrary.org/b/id/${cover_i}-L.jpg`, creator = `author_name[0]`, rating = `ratings_average * 2` only when `ratings_count >= 3` (otherwise omit; "if available"). Requests send `User-Agent: my-lists (<OPEN_LIBRARY_CONTACT>)`.
  - Every rating written is a number in 0–10 with one decimal, validated `0 < r <= 10`; anything else is dropped.
- Throttles: tmdb 120 ms, omdb 250 ms, rawg 250 ms, jikan 450 ms (3 req/s and 60/min limits), openLibrary 1000 ms. Each lookup has an 8 s timeout.
- Do not touch: sheets write code, `src/`.
- Checklist: [ ] tests: exact-title match accepted; wrong-year sequel rejected; `confidence < 0.6` → `null` [ ] `need:['imdbRating']` for a movie makes TMDB search+details+OMDb calls only and returns no poster; `need:['poster']` makes exactly ONE fetch call (assert call count) [ ] OMDb `"N/A"` → no rating; RAWG metacritic 88 → 8.8; RAWG no metacritic + rating 4.2 with 50 ratings → 8.4; Jikan score 8.754 → 8.8; Open Library 4.1 with 2 ratings → omitted; 4.1 with 10 ratings → 8.2 [ ] 429 with Retry-After retries then returns `null` with `provider_error` thrown as typed error [ ] throttle spaces calls (fake timers) [ ] no API key appears in any returned object or log.

### Step 20: Write layer + `/api/posters/fill` (enrichment, fetch-once)
- Create: `server/sheets/{writeGuard,writeCells}.ts`, `server/images/enrich.ts`, `api/posters/fill.ts`, tests `server/sheets/__tests__/writeCells.test.ts` and `server/images/__tests__/enrich.test.ts` (fake in-memory SheetsClient implementing both methods over a mutable 2D array; fake providers that count calls).
- `enrich.ts`: `enrichItems(client: SheetsClient, items: PosterFillItem[]): Promise<PosterFillResult[]>`. Flow, in order:
  1. Validate body with zod (max 8 items, `needs` non-empty, every field in `needs` allowed by `WRITE_POLICY[tab]`, tab in `POSTER_LISTS` or a picks id).
  2. FRESH READ: `batchGetValues` the involved tabs; locate each row by `titleKey` (+year/+because); compute `stillEmpty = needs.filter(f => column exists && cell is empty)`. If `stillEmpty` is empty → result `already_filled`, ZERO provider calls for this item. Not found/ambiguous → `not_found`/`write_skipped` with detail, zero provider calls.
  3. Call `providerFor(tab).lookup({ title, year, need: stillEmpty })` per item (concurrency 1 per provider, providers in parallel via `p-limit`). Providers return only the requested fields; any extra returned field is discarded.
  4. Build `CellWrite[]` with `expectedCurrent: ''` for each field the provider returned (`imdbRating` value is a number; others strings; poster validated with `sanitizePosterUrl`), then ONE `writeCells` call (which itself re-reads, see 4.5).
  5. Merge into `PosterFillResult[]`: `written` per field, `missed` = fields in `stillEmpty` that the provider did not supply (client puts these in the 7-day miss cache), outcome `ok` (all written), `partial`, `not_found` (nothing found), `provider_error`.
- `api/posters/fill.ts` is a thin wrapper (auth + `enrichItems`). Handler total budget 25 s; items not finished return `provider_error` with `detail:'timeout'` and are retried later by the client.
- Do not touch: `src/`.
- Checklist: [ ] tests: a row whose Poster, IMDb Rating, Director/Creator and Franchise are all filled makes ZERO provider calls and ZERO writes (`already_filled`) [ ] a field filled by someone else between the client's payload and the request is not fetched (provider call counter unchanged for that field) [ ] only EMPTY cells are written: a non-empty cell → `skipped_conflict`, nothing overwritten [ ] `My Rating` can never be written (type-level: not in `WritableField`; runtime: zod rejects `needs:['myRating']`) [ ] IMDb Rating is written as a numeric cell (JSON number, not a string) [ ] tests: writes land in the correct row even after rows are re-sorted between read and write (simulate by shuffling the fake data between calls) [ ] `field:'status'` or any non-policy field → `WriteForbiddenError` (policy test per tab) [ ] duplicate titles without a distinguishing year → `skipped_ambiguous`, no write [ ] missing Poster header → `skipped_missing_column`, no write [ ] other/curious → `skipped_policy` [ ] inspect that no code path calls anything except `batchUpdateValues` with single-cell A1 ranges.

### Step 21: Client enrichment (poster, IMDb rating, creator, franchise) — fetch once
- Create: `src/services/images/posterApi.ts`, `src/features/posters/{usePosterFill,negativeCache}.ts`; edit `ListPage.tsx` (call `usePosterFill(listId)`), `src/features/data/useLists.ts` (patch cache on results).
```ts
export function fillPosters(items: PosterFillItem[]): Promise<PosterFillResult[]>; // POST /api/posters/fill
export function usePosterFill(listId: ListId): { pending: number; done: number; running: boolean; failed: number }
// negativeCache: localStorage 'ml.enrichMiss.v1' { [`${tab}:${titleKey}:${year}:${field}`]: epochMs }, TTL 7 days. Per FIELD, so a missing IMDb rating never blocks a poster.
export function isRecentMiss(key: string): boolean; export function markMiss(key: string): void;
// Pure, unit-tested: decides what to send. Returns [] when nothing needs fetching.
export function buildFillItems(payload: ListsPayload, listId: ListId, now: number): PosterFillItem[];
```
- `buildFillItems` rules (this is the fetch-once gate): for each row of `listId` (list tabs in `POSTER_LISTS` only; Other/Curious never), `needs` = fields among `poster`, `creator`, `franchise`, `imdbRating` where (a) the value in the payload is empty/null, (b) `payload.columns[listId][field]` is true (header exists), and (c) `isRecentMiss(key)` is false. Skip the row when `needs` is empty. Rows with all four filled/missed/unavailable produce NO item, so a normal load with a fully filled sheet sends no request at all.
- Behavior: after `useLists` has data and the list page is mounted, run `buildFillItems` once per mount per `dataHash`; send batches of 8 sequentially (never parallel), 1 s pause between batches; on results patch the React Query cache (`setQueryData`) with the values the server returned in `written` so cards update live without a refetch; every field in `missed` → `markMiss`; `outcome:'already_filled'` → patch nothing, the next normal refetch brings the sheet's values; `provider_error` → retry once at the end, then give up for this session (no miss mark); a banner chip "Enriching 12/48" in `ListHeader`; abort on unmount/route change (AbortController) and when `document.hidden`. If a column header is missing, show a one-time info toast per column, e.g. "Add a 'Poster' column to enable automatic posters" / "Add an 'IMDb Rating' column to enable automatic ratings". After the run, if >50% of items still lack posters, show a toast suggesting table view. Never block rendering. No other client code may call `/api/posters/fill`.
- Do not touch: server code.
- Checklist: [ ] unit test `buildFillItems`: fully filled list → `[]`; row with only empty IMDb Rating → `needs:['imdbRating']`; missing `IMDb Rating` header → field never requested; recent miss for `imdbRating` excluded but `poster` still requested; Other/Curious → `[]` [ ] with a fully filled sheet, opening every list shows ZERO requests to `/api/posters/fill` in DevTools Network, and the dev-api log shows zero provider calls [ ] with 3 empty Poster + IMDb Rating cells and real keys, after opening Movies those cells get values in the sheet within ~15 s and cards update live (My Rating column untouched) [ ] reloading does NOT re-request the same ones; the sheet now holds the values [ ] a title not found is marked as miss per field and not retried for 7 days [ ] clearing a cell in the sheet by hand makes exactly that cell refetch on the next load (miss cache aside) [ ] turning off the network mid-run leaves the UI usable, no crash [ ] sorting the sheet manually while the app runs never moves a value to the wrong row (manual test, record result) [ ] only rows with at least one empty needed cell are sent (inspect the request payload in DevTools).

### Step 22: Picks server
- Create: `api/picks/status.ts`, `server/picks/updatePickStatus.ts`, tests.
```ts
export function updatePickStatus(client: SheetsClient, req: PickStatusRequest): Promise<PickStatusResult>;
```
- Validation: zod; `status` must be one of `PICK_STATUS_OPTIONS[picksId]` (Movies picks: Want to/Must watch/Maybe/Watched; Series picks: Want to/On hold/Maybe later/Watched; Games picks: Want to/Played/Completed/On hold) or `''` (undo only); `expectedCurrent` must be `''` or one of that tab's options. The literal `'Skip'` (any case) is rejected with 400 `bad_request`: skipping is client-local and must never reach the sheet. Uses `writeCells` with `field:'pickStatus'`, `titleKey = normalizeTitle(title)`, `becauseKey = normalizeTitle(because)`, `year`. Mapping: `written`→`written`, `skipped_conflict`→`conflict` (+`currentValue`), `skipped_not_found`→`not_found`, `skipped_ambiguous`→`ambiguous`. If `process.env.FEATURE_PICKS !== 'true'` → 404 `feature_disabled` BEFORE any sheet access. Undo is the same endpoint with `status: ''` allowed only when `expectedCurrent` equals the app's own previous write.
- Do not touch: `src/`, poster code.
- Checklist: [ ] tests: concurrent edit (cell changed by someone else) → `conflict`, original value preserved [ ] row moved by a sort between read and write still updates the correct pick [ ] flag off → 404 and zero Sheets calls [ ] cannot write any value outside the allowed vocabulary: `Skip` → 400, `Watched` on `games-picks` → 400, `Played` on `movies-picks` → 400, `Must watch` on `series-picks` → 400, all 12 valid (tab, status) pairs → written [ ] Status column of main tabs cannot be written through this endpoint.

### Step 23: Picks UI (feature-flagged)
- Create: `src/services/sheets/picksApi.ts`, `src/features/picks/{PicksPage,PickDeck,PickCard,usePicksQueue}.ts(x)`; edit router (`/picks` renders NotFound when `import.meta.env.VITE_FEATURE_PICKS !== 'true'`), BottomNav/Home links respect the flag, search `onSelect` for picks → `/picks?tab=<picksId>&q=<title>`.
```ts
export function postPickStatus(req: PickStatusRequest): Promise<PickStatusResult>;
export function usePicksQueue(picksId: PicksId): {
  current: PickItem | null; upcoming: PickItem[]; remaining: number;
  act(action: PickAction): void; undo(): void; canUndo: boolean; syncing: number; lastError: string | null;
}
```
- Semantics: a pick is shown while its sheet Status is blank (`status === ''`); blank means "not chosen / not interested". "Skip" NEVER writes to the sheet: it only adds the pick's `id` to a session-only set (`sessionStorage` key `PICKS_SKIPPED_KEY`, cleared when the browser tab session ends) and hides the card. Skipped cards reappear in a new session because the sheet is unchanged. `usePicksQueue.act({type:'skip'})` must not call `postPickStatus`.
- UI: segmented control (Movies / Series / Games picks); deck of up to 3 stacked `PickCard`s (poster, title, year, genres, "Because you liked X", why; no `RatingBadge` on picks; badge "Already in your list: <status>" if the title exists in the target main list); action bar shows one button per status in `PICK_STATUS_OPTIONS[picksId]` (4 buttons, grid 2x2 on mobile, 56 px, thumb reachable) plus a distinct neutral "Skip" button (labelled "Skip for now", icon `EyeOff`, with a hint "Hides until next session"). `motion` drag on the top card: right = `PICK_SWIPE_MAP[picksId].right` ("Want to"), up = `PICK_SWIPE_MAP[picksId].up` ("Watched"/"Played"), left = Skip (local). Statuses without a gesture (Must watch, Maybe, On hold, Maybe later, Completed) are button-only. Keyboard: ArrowRight/ArrowUp/ArrowLeft mirror the gestures, keys 1–4 trigger the 4 status buttons, `S` = skip. Thresholds: 120 px or 500 px/s. Optimistic: card leaves immediately; status writes are queued (sequential) with toast on conflict ("Changed elsewhere to <value>; card removed") and on `not_found`; Undo reverts the last action: for a status write it posts `status:''` with `expectedCurrent` = what we wrote; for a skip it just removes the id from the skipped set. After each success patch the React Query cache; refetch on focus naturally drops picks changed elsewhere.
- Do not touch: server code, theme values.
- Checklist: [ ] flag off → no nav entry, `/picks` is 404, API 404s [ ] for each of the 3 picks tabs, each of its 4 status buttons writes exactly that text to the right row (verify in the sheet) and nothing else changes [ ] Skip (button, left swipe, `S`) hides the card, produces NO network request to `/api/picks/status` (Network tab), leaves the sheet cell blank, and the card returns after a new browser session [ ] reloading the page in the same tab session keeps skipped cards hidden [ ] editing the same cell in the sheet during a swipe produces a conflict toast and never overwrites [ ] sorting the picks tab in the sheet while open doesn't corrupt anything [ ] undo of a status write restores an empty cell; undo of a skip just un-hides the card [ ] reduced-motion users get buttons-only, no drag.

### Step 24: Polish, resilience, deploy readiness
- Create/edit: `src/components/common/ErrorBoundary.tsx` (wrap routes), `src/hooks/useOnline.ts` + offline banner, `public/manifest.webmanifest` + meta tags (theme-color, icons optional), remove `/_theme` dev route, `vercel.json` add headers (`Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`), `docs/SETUP.md` deploy section (Vercel steps, env var copy, `GOOGLE_PRIVATE_KEY` note), a11y pass (focus rings, labels, `aria-live` for search count), page-transition QA, Lighthouse mobile run, add RAWG attribution link in footer, README.md.
- Do not touch: logic in server/sheets/write*.
- Checklist: [ ] `npm run build` and `npx vercel build` (if CLI installed) succeed [ ] Lighthouse mobile performance >= 85, accessibility >= 95 [ ] airplane mode shows cached data + offline banner [ ] an unexpected render error shows the boundary, not a white screen [ ] manual regression: login, search, every list, filters (incl. rating by Best/Mine/external), smart views, posters, ratings, picks (4 statuses + local Skip) [ ] with a fully enriched sheet, a full click-through of the app produces zero `/api/posters/fill` requests [ ] grep confirms no secret/`process.env` use in `src/`.

## 10. Phase 2 plan (ADD) — planning only

Feature flag `FEATURE_ADD` / `VITE_FEATURE_ADD`; enable the Home "Add" button only when on.
- P2-1 `/add` UI: title input + status select (statuses of the chosen list; list auto-detected by Gemini, user can override) -> "Look up".
- P2-2 `server/ai/gemini.ts`: `lookupMedia(title: string, hint?: ListId): Promise<AddCandidate>` with Google Search grounding. Because grounding and strict JSON schema output may not be combinable on every model, do two calls if needed: (a) grounded call returns facts as text, (b) a no-tools call converts to JSON; validate with zod. `AddCandidate { type: MediaKind; list: ListId; title: string; year: number|null; genres: string[]; creator: string|null; franchise: string|null; why: string; confidence: number }`. Rate limit 10 lookups/min/user; verify free-tier model name and quota in AI Studio before coding.
- P2-3 `POST /api/add/preview` -> candidate + poster/IMDb rating via the existing `providerFor(list).lookup({ need: ['poster','imdbRating'] })`; on confirm these are written into the new row together, so the new row is already "fetched once" and never triggers enrichment later. My Rating is left empty for the user.
- P2-4 Preview card (reuse theme `PosterCard`) with editable fields, duplicate detection (same `titleKey` in target list -> warn and offer "Open existing").
- P2-5 `POST /api/add/confirm` -> `appendRow` in a NEW `server/sheets/appendRow.ts`: re-read the tab, abort if the same title now exists, build the row from the tab's header map (leave unknown columns empty), `values.append` with `insertDataOption: INSERT_ROWS`. This is the only append code in the repo; `WRITE_POLICY` gets a new `append` capability limited to the 7 list tabs and requires `FEATURE_ADD=true`.
- P2-6 Invalidate the lists cache, toast, navigate to the new item. Tests: duplicate race, header reorder, append when the tab was sorted.

## 11. Risks and how the design handles them

- Sheet edited live / rows moved by an assistant or sort script: rows are identified only by `titleKey` (+year, +because) and located by a FRESH read immediately before every write; writes are single-cell A1 updates guarded by `expectedCurrent` compare-and-set; post-write verification restores our cell if the row moved; no row index leaves the server; no delete/sort/insert/clear call exists in the codebase.
- Residual race (milliseconds between read and write; Sheets has no conditional write): accepted; consequence is bounded to one fill-only enrichment cell or one pick-status cell and is detected by the verify step. Google protected ranges are deliberately NOT used (the assistant needs full API access); safety is code-level only.
- Concurrent enrichment by you/the assistant: the server re-reads the tab right before calling providers and again before writing, only fills cells that are still empty, and never overwrites; a value typed manually always wins over an auto-fetched one.
- Duplicate titles: ids suffixed, ambiguous writes are skipped, never guessed.
- Rate limits: Sheets read = 1 batchGet per refresh (limit 300/min/project) plus 15 s server cache and focus-based refetch with 60 s stale time; writes batched <= 8 items per call, sequential. TMDB generous; OMDb free tier ~1,000/day (only called for rows whose IMDb Rating is empty, once per row ever); RAWG monthly cap and attribution; Jikan 3 req/s + 60/min (throttle 450 ms, honors Retry-After); Open Library throttled 1/s with identifying User-Agent. The fetch-once rule (section 4.6) means external calls scale with NEW rows, not with page loads; the first run over a large unfilled sheet is the only heavy moment and is batched (8 items per request, sequential, 1 s apart) and resumable. The per-field 7-day miss cache stops repeated lookups for things providers don't have. Login attempts rate-limited.
- Rating semantics drift: "IMDb Rating" holds a different source per list (IMDb/MAL/Metacritic/Open Library); the UI always shows the per-list label via `externalRatingLabel`, and ratings are normalized to 0–10 at write time so mixed lists sort sensibly. If a provider changes its scale, only its mapper in `server/images/*` changes; already-written values are not re-fetched (clear the cells to refresh).
- Picks vocabulary mismatch: if the sheet's own status words change, edit `PICK_STATUS_OPTIONS` (a test keeps them aligned with `STATUSES`).
- API changes/outages: each provider isolated behind `PosterProvider`; failures yield `provider_error`, UI falls back to `PosterFallback` and table view, app never blocks. Provider responses parsed with zod-light guards (optional chaining + type checks). RAWG/IGDB swappable.
- Wrong poster matches: confidence scoring with year check and `MIN_CONFIDENCE 0.6`; only empty cells are filled so you can fix a bad one by editing the sheet.
- Sheet shape drift (renamed header, missing tab, odd date formats): header-alias mapper, warnings instead of crashes, `npm run check-sheet` diagnostic.
- Secrets: only in `.env`/Vercel env; `.env` git-ignored; `.env.example` has no values; secrets never in `VITE_` vars, logs, or responses; service account has no access beyond the one Sheet.
- Auth: bcrypt hash in env, constant-time-ish login, rate limit, JWT 30 d in localStorage (accepted XSS tradeoff; CSP added); single `AuthProvider` seam for multi-user later (`getSheetIdForUser`).
- Serverless limits: handler time budget 25 s with small batches; <= 12 functions (6 used now, 8 after Phase 2); in-memory cache/rate limiter are best-effort per instance.
- Vercel ESM import resolution: server/api code uses relative imports with `.js` extension and no `@/` alias (enforced by lint rule).
- Large payload / perf: ~1k rows ≈ <1 MB JSON; whole payload cached client-side, Fuse index memoized by `dataHash`, progressive rendering of grids.
- Time zones/date formats: parsed to ISO UTC in the mapper; displayed relative ("3 days ago").
- Gemini (Phase 2): hallucinated metadata mitigated by grounding, preview-and-confirm, and duplicate check.

## 12. CURSOR_RULES (copy to `.cursor/rules/my-lists.mdc`)

```
---
description: My Lists coding conventions
alwaysApply: true
---
# My Lists conventions

## General
- Follow PLAN.md. Implement exactly one numbered step per task; do not start the next step.
- Strict TypeScript. No `any` (use `unknown` + narrowing), no `@ts-ignore` without a comment explaining why. No non-null `!` on external data.
- Prefer named exports. One React component per file, file name = component name (PascalCase). Hooks `useX.ts`. Pure logic in plain `.ts` files with unit tests.
- Never add a dependency not listed in PLAN.md section 2 without asking. Pin exact versions (`--save-exact`).
- Windows/PowerShell: use `npm run` scripts; no bash-only syntax.

## Structure
- Feature-based: `src/features/<feature>/`. Shared UI in `src/components/`. Pure helpers in `src/lib/`. Types in `src/types/`.
- `src/` must never import from `server/` or `api/`. `server/` and `api/` may import only `src/types/*`, `src/lib/{normalize,dates,rating}.ts`, using relative paths WITH `.js` extension. No `@/` alias in `server/`, `api/`, `scripts/`.
- `api/*.ts` files are thin: validate method/auth, call `server/**`, return via `ok()`/`fail()`. No business logic there.
- Do not edit `src/components/ui/*` by hand; regenerate with the shadcn CLI.

## Data and Sheets
- Never rely on row indexes or fixed column letters. Map columns by header via `buildColumnMap`. Identify items by `titleKey` (+year/+because), never by row.
- The only sheet write path is `writeCells` guarded by `WRITE_POLICY`. Never add delete/clear/sort/insert/append calls (append only in Phase 2 `appendRow`).
- Always re-read the sheet immediately before writing. Writes are single-cell and compare-and-set with `expectedCurrent`.
- Never write Title, Status (main tabs), Year, Genre, Why, Updated at, My Rating, Platform. Writable = Poster, Director/Creator, Franchise, IMDb Rating (fill-only, only into empty cells) and picks-tab Status (only values in `PICK_STATUS_OPTIONS`).
- Fetch once: external provider calls (TMDB/OMDb/RAWG/Jikan/Open Library) happen ONLY inside `POST /api/posters/fill` for fields whose sheet cell is empty. Never call a provider from page load, search, list read, filters or picks. After a value is written to the sheet, read it from the sheet.
- Picks "Skip" is local to the browser session and must never be sent to the API or written to the sheet.
- Ratings: sort/filter/top-rated use `effectiveRating` (`myRating ?? imdbRating`); always show both ratings with `RatingBadge`; label the external one with `externalRatingLabel(listId)`.
- No Google protected ranges and no sheet-side permission tricks: safety is in `WRITE_POLICY` and `writeCells` only.
- Treat all sheet/API data as untrusted: parse with the helpers in `src/lib`, validate request bodies with zod, only accept `https://` poster URLs.

## Secrets and auth
- Secrets only from `process.env` inside `server/config/env.ts`. Never read `process.env` elsewhere; never use `import.meta.env` for secrets; no secret in any `VITE_` var.
- Never log passwords, hashes, tokens, API keys, or private keys. Never commit `.env`. Update `.env.example` (names only, no values) whenever an env var is added.
- Auth goes through `AuthProvider` (server) and `AuthService` (client) only.

## API
- Every endpoint returns `ApiResponse<T>` (`{ok:true,data}` | `{ok:false,error:{code,message}}`). Use the shared codes in `src/types/api.ts`. Client calls go through `apiFetch`.
- External API calls go through a `Throttle`, have an 8 s timeout, and failures degrade gracefully (return null / typed error), never crash a request.

## UI
- Mobile-first: write base styles for 390px, then `sm:`/`md:`/`lg:`. Use `100dvh`, 44px min touch targets, safe-area padding.
- Styling: Tailwind utility classes + CSS variables from `src/themes/themes.css`. No inline hex colors in components; use theme vars. No CSS-in-JS.
- Use shadcn components for controls. Icons from `lucide-react` only.
- Animation: `motion/react` only, durations/easings from `src/themes/motion.ts`, animate `transform`/`opacity` only, stagger max 12 items, respect reduced motion. Page transitions via `PageTransition`.
- Every data view has loading (skeleton), empty, and error states. Images always go through `PosterImage` (lazy + fallback).
- Filter/sort/view state lives in the URL (`useSearchParams`); view preference in localStorage via `useLocalStorage`.
- Accessibility: semantic elements, labels on inputs/buttons, visible focus rings, contrast >= 4.5:1.

## Testing and quality
- Add Vitest tests for every pure function and every server module (mock `fetch`/SheetsClient; no real network in tests).
- Before finishing a step run `npm run typecheck && npm run lint && npm run test` and report the checklist pass/fail.
- No `console.log` left in committed code (use `console.warn`/`error` sparingly on the server, never with secrets).
- Small commits: one per step, message `step N: <name>`.
```

## 13. Step order at a glance

1 scaffold · 2 Tailwind/shadcn · 3 types/helpers · 4 API foundation · 5 auth server · 6 auth client/router · 7 sheet mapping · 8 readAll + /api/lists · 9 client data layer · 10 themes/motion/transitions · 11 shared UI · 12 search + Home · 13 My Lists · 14 list page shell/views · 15 filters/sort/URL · 16 stats + smart views · 17 Movies/Series cards · 18 Anime/Games/Books cards + Other/Curious · 19 image providers · 20 write layer + poster endpoint · 21 client poster fill · 22 picks server · 23 picks UI · 24 polish/deploy.
