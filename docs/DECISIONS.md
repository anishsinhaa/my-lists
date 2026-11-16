# Decisions

## Step 1 — 2026-11-16

### Scaffold

`create-vite@9.3.4` with the `react-ts` template. The folder already contained `PLAN.md` and `.cursor/`, so the template was generated in a temporary directory and moved in. Those two paths were not modified.

### Template versions kept

The template's version ranges were left as generated. `npm install` resolved:

- `vite@8.3.8`
- `react@19.3.1` and `react-dom@19.3.1`
- `typescript@7.0.2`
- `@vitejs/plugin-react@6.3.0`
- `oxlint@1.90.0` range, resolved `1.94.0`

`tsc -b --noEmit` passed on TypeScript 7, so it was not pinned back to 5.x.

### Linter

This template ships Oxlint, not ESLint. `npm run lint` runs `oxlint`. ESLint was not added: it is not in the template and not in the PLAN.md section 2 install list.

### Dependencies pinned with `--save-exact`

Runtime: `tailwindcss@4.3.5`, `@tailwindcss/vite@4.3.5`, `motion@14.14.0`, `fuse.js@7.5.0`, `react-router-dom@7.18.5`, `@tanstack/react-query@5.107.1`, `embla-carousel-react@8.6.0`, `lucide-react@1.73.0`, `clsx@2.1.1`, `tailwind-merge@3.7.0`, `class-variance-authority@0.7.1`, `tw-animate-css@1.4.0`, `zod@4.6.7`, `jose@6.2.17`, `bcryptjs@3.0.3`, `@googleapis/sheets@18.1.3`, `p-limit@7.3.3`, `dotenv@18.0.10`.

Dev: `vitest@5.1.0`, `@testing-library/react@16.3.3`, `jsdom@31.0.1`, `@types/node@26.6.6` (replaces the template's `^24.19.2`), `@vercel/node@31.0.0`, `tsx@4.23.15`, `concurrently@10.0.7`.

Fonts (installed, not imported until Step 10): `@fontsource/bebas-neue@5.3.0`, `@fontsource-variable/inter@5.3.0`, `@fontsource-variable/fraunces@5.3.0`, `@fontsource-variable/nunito@5.3.0`, `@fontsource/bowlby-one@5.3.0`, `@fontsource/poppins@5.3.0`, `@fontsource-variable/orbitron@5.3.0`, `@fontsource/rajdhani@5.3.0`, `@fontsource-variable/lora@5.3.0`, `@fontsource-variable/source-serif-4@5.3.1`. Every requested font package name resolved.

shadcn is Step 2 and was not initialized.

### Typecheck inputs

`tsconfig.api.json` includes `api`, `server`, `scripts`, `src/types`, and `src/lib`, plus `vitest.config.ts`. Those directories are empty in Step 1, and `tsc` errors with TS18003 when a project has no inputs. `vitest.config.ts` is the one input, and it is not included by `tsconfig.node.json`, so it belongs to a single project. Remove it from the api include once `api/` or `server/` has its own `.ts` files (Step 4).

### Tests

`vitest` is set to `passWithNoTests: true` so `npm run test` is green before Step 3 adds tests.

### jsdom and Node

`jsdom@31.0.1` declares `node: ^22.22.2 || ^24.15.0 || >=26.0.0`. This machine is Node `v24.11.0`, so npm printed `EBADENGINE`. The plan's `npm view` version was kept. The first test that loads jsdom needs a Node that satisfies that range, or a later decision to pin an older jsdom.
