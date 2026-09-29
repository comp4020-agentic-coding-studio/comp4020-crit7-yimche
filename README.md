# ANU campus parking

A full-stack finder for parking on the ANU Acton campus. It answers the two
questions the current arrangement makes you juggle across signage, a PDF and an
app: *where can I park and what will it cost me?*, and *which car park actually
has room right now?*

Every parking area OpenStreetMap records on campus is listed with its hours,
rate, the permit it wants and the fees and eligibility behind that permit, and
each one is a pin on an OpenStreetMap map. The list is searchable and filterable
by category, and the map shows exactly the set the list does: narrow the list and
the pins narrow with it. On top of the reference data sits one live flow: anyone
can report how full a car park is, the report is saved, and every open tab (and
the map) updates in real time. Open the site in two tabs and report a park in one
to see it.

## What good looks like here

Good here is a driver trusting the page enough to leave the house on it. That
rests on three decisions:

1. **The directory is the source of truth, and it needs no JavaScript.** The
   map and the live updates are progressive enhancement. If Leaflet or the
   network is unavailable, the server-rendered list still carries every fact,
   and the report form still works through a plain POST and redirect. This is
   also what keeps the accessibility floor green.
2. **State lives in the schema, and the core flow persists.** Car parks and
   reports are SQLite tables defined in `src/lib/schema.ts`; the facts are
   seeded from `src/lib/parking-data.ts` on first boot. A report is written to
   the volume, so it survives a reload and a redeploy, and broadcast over SSE to
   other clients. That is the crit's persistence contract, and
   `spec/parking.test.ts` holds it.
3. **The data is honest about what it is.** The rate scheme follows ANU's
   [published 2026 parking fees](https://services.anu.edu.au/campus-environment/transport-parking/parking-fees):
   staff surface permits at $7.78/day, staff parking stations at $9.59/day,
   non-resident student surface at $3.88/day, resident student at $4.90/day, and
   free parking for accessible-permit and motorbike users, with pay and
   time-limited zones enforced 8am–5pm Mon–Fri and free after 5pm and on
   weekends. The whole directory is **generated from OpenStreetMap** (©
   OpenStreetMap contributors) by `scripts/gen-parking.mjs`: every entry is a
   distinct mapped parking feature, its coordinates are the feature's centre (the
   same data the map draws), and any capacity or accessible-bay count shown is
   what OSM records. What is **still interpretive, not a survey**, is each lot's
   category, rate and permit; those are derived from its OSM access/fee/type tags
   mapped onto the ANU fee scheme (e.g. `access=private` → resident/private,
   `access=permit` → permit zone, public + `fee=yes` → visitor pay, otherwise the
   campus staff/student surface default), and unnamed lots are labelled by the
   nearest mapped landmark. The app
   says so in its footnote. Before this could be relied on, each lot's permit
   zone would need checking against the official permit-zone map.

### What's enforced vs. judged

`spec/invariants.test.ts` (shipped) enforces the accessibility floor and the
structural basics on every route in `spec/routes.ts`. `spec/parking.test.ts`
(mine) enforces the contracts above: the directory carries each area's facts and
the grounded rate figures, a report survives a reload, and a report is broadcast
over SSE. What a person still judges at the crit: whether the data is *right*,
whether the map reads well, and whether the live flow feels useful rather than
gimmicky.

### What I chose not to build

No accounts, no permit purchase or payment, no per-user favourites, no routing
or space-level (bay-by-bay) tracking. The slice is deliberately "read the facts,
report the state," which is the part that actually frustrates a driver and the
part that exercises schemas, SQLite and migrations.

## Running it

```sh
mise install && pnpm install
pnpm dev     # local dev server under the base path
pnpm check   # typecheck + build + tests against the running app
```
