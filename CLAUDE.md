# Harness for this deliverable

Crit 7: an ANU campus parking finder. A driver should be able to see every
parking area on the Acton campus, what it costs and what permit it wants, and
which ones still have room right now. Built on the shipped stack (Astro SSR,
Drizzle, SQLite, Fly.io).

These are the rules the agent works under here. They are mine, decided for this
app, and they are part of what gets marked.

## Ground truth and honesty

- **The schema is the source of truth for state.** Change data shape only in
  `src/lib/schema.ts`, then `pnpm db:generate` and commit the migration. Never
  edit the database or a migration by hand.
- **Seeded facts live in `src/lib/parking-data.ts`.** The rate scheme is
  grounded in ANU's published 2026 parking fees, cited in that file. Anything
  not grounded (car-park names, capacities, exact map coordinates) is labelled
  as an illustrative placeholder there, in the README, and in the app's own
  footnote. Do not present a placeholder as a surveyed fact, in code or prose.
- Crowd-sourced availability is unverified by definition; the UI says so.

## What the app must keep doing

- The **directory works with no JavaScript**; it is the accessible source of
  truth. The map and the live updates are enhancements layered on top, so if
  Leaflet or the network fails, the page still tells you everything.
- A **report persists across a reload** and reaches other open tabs over SSE.
  That is the core flow; `spec/parking.test.ts` guards it.
- The map uses **OpenStreetMap** tiles via Leaflet (from CDN), with attribution.

## Working rules

- Keep `pnpm check` green (typecheck + build + the running-app tests). Add a
  page's route to `spec/routes.ts` so the invariants keep covering it.
- Test **contracts, not construction**: assert what a page does, so a test
  survives a rewrite of how it's built.
- Match the starter's house style: small commented modules, plain HTML forms
  with a 303 redirect, one process and one event bus (the app is single-machine
  by `fly.toml`, and the SSE bus depends on that).
- Prose in this repo follows the house voice: no em-dashes.
