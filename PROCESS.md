# Process

## Overview

The brief was "build the ANU system you wish existed." I chose campus parking: a
driver currently has to reconcile signage, a fees PDF and a payment app, and
still can't tell which car park has room. The app collapses that into one page,
a directory backed by an OpenStreetMap map, with a live "how full is it?" report
flow on top so the map is worth looking at.

I built it on the shipped stack (Astro SSR, Drizzle, SQLite, Fly.io) and against
the crit's fixed spec: it deploys to `*.fly.dev`, models a real slice end to
end, and the core flow persists across a reload.

## How the work went

1. **Read before building.** I read the starter's own files (`fly.toml`,
   `Dockerfile`, `astro.config.mjs`, `src/lib/*`, the shipped `spec/*`) and the
   crit 7 brief and spec on the course site, so the app was designed to the
   platform rather than retrofitted to it. Key constraints I carried out of that
   read: single machine (so the SSE event bus is safe), migrations apply at
   boot, and the invariants only cover routes named in `spec/routes.ts`.
2. **Modelled the data first.** Two tables in `src/lib/schema.ts`: `car_parks`
   (the reference facts) and `reports` (the live state, with a foreign key back
   to a car park). I regenerated the migration from a clean slate because the
   app had never deployed, so there was no live volume to preserve.
3. **Seeded honestly.** The rate scheme in `src/lib/parking-data.ts` is grounded
   in ANU's published 2026 parking fees, cited in that file. The car-park names,
   capacities and coordinates are illustrative placeholders, and I labelled them
   as such in the seed, the README and the app's footnote rather than dress them
   up as surveyed data.
4. **Wired the flow end to end.** A plain HTML form POSTs a report, which
   persists to SQLite (303 redirect back to the card, so it works with no JS)
   and broadcasts over the existing SSE bus to update every other tab and the
   map marker.
5. **Retired the starter.** The guestbook message table, its API route and
   `spec/guestbook.test.ts` describe the starter, so they went when I replaced
   it, as the spec says they should.
6. **Wrote contract tests.** `spec/parking.test.ts` asserts the running app:
   the directory carries each area's facts and the grounded figures, a report
   survives a reload, an invalid level is dropped, and a report is broadcast
   over SSE.

## Directing, grounding and correcting

- **Directed:** I made the scope call that a pure browse-only directory would
  not exercise the crit's persistence contract, and chose live availability
  reports as the slice that both fixes a real frustration and demonstrates
  schemas, SQLite and migrations.
- **Grounded:** I pulled the 2026 rate scheme from the ANU services site rather
  than invent numbers, and I recorded exactly which parts of the data are
  grounded and which are placeholder, so no reader mistakes one for the other.
- **Corrected:** the first typecheck failed because the client script referenced
  Leaflet's types, but Leaflet loads from a CDN and is not a typed dependency;
  I retyped the browser globals loosely and added the explicit `is:inline`
  directive the compiler asked for. I also normalised a coordinate that had been
  written as an expression rather than a literal.

## Commit record

The work grew in logical commits, cited here (each link's text is the commit
SHA, which `pnpm check:evidence` resolves against this repo):

- Data layer (schema, seed, migration): [`8f0bccd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yimche/commit/8f0bccd)
- Report API and SSE stream: [`54b5d55`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yimche/commit/54b5d55)
- ANU-styled UI (map, directory, report forms, chrome): [`3e7d467`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yimche/commit/3e7d467)
- Spec tests, retiring the guestbook test: [`f9cf8c8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-yimche/commit/f9cf8c8)
