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
   free parking for accessible-permit and motorbike users. The enforcement hours
   and permit-type names follow ANU's
   [parking options on Acton campus](https://services.anu.edu.au/campus-environment/transport-parking/parking-options-on-acton-campus):
   pay, permit and time-limited zones are enforced 8am–5pm Mon–Fri, public
   holidays excepted, with no pay or permit required outside those hours, though
   signed bay limits still apply 24/7. The whole directory is **generated from OpenStreetMap** (©
   OpenStreetMap contributors) by `scripts/gen-parking.mjs`: every entry is a
   distinct mapped parking feature, its coordinates are the feature's centre (the
   same data the map draws), and any capacity or accessible-bay count shown is
   what OSM records. The set is **clipped to the campus** by the roads that ring
   it, Clunies Ross Street, Barry Drive and Edinburgh Avenue, so lots the extract
   caught beyond them (CSIRO Black Mountain and the Botanic Gardens, North Oval
   and Toad Hall, New Acton) are left out; the boundary is traced from those
   roads' own OSM geometry. What is **still interpretive, not a survey**, is each lot's
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

### Accounts, cars, tickets and payment

On top of the public directory sits a signed-in flow: a driver registers an
account, adds one or more of their cars, books a casual parking session (a
"ticket") at a car park for one of those cars, and pays for it. Like the report
flow, every step is a plain HTML form that ends in a 303 redirect, so it works
with no JavaScript, and every step is state defined in `src/lib/schema.ts`
(`users`, `sessions`, `cars`, `tickets`, `payments`) and reached only through
the queries in `src/lib/accounts.ts`. Passwords are stored only as a scrypt hash
with a per-user salt (`src/lib/auth.ts`); a session is an unguessable token in an
httpOnly cookie, backed by a row so it can expire and be revoked on logout. Each
user's data is scoped to their id, so one account can never read or pay
another's tickets; `spec/accounts.test.ts` holds that, along with the register →
add car → book → pay chain.

Two honesty notes carry over from the rest of the app. **Ticket prices are
grounded**: a ticket is priced on ANU's published 2026 PayStay pay-as-you-go
rates (staff/student $2.36/hour or $16.92 all day; visitor $3.07/hour or $27.63
all day), which is the parking a driver actually buys on the spot with no permit;
the permit day-rates are shown for comparison but not sold here, and free parking
(accessible bays, motorbikes, honorary staff) is never charged for. **Payment is
simulated**: confirming a ticket takes no card details and moves no money, it
only records that a charge of the ticket's price was made and marks the ticket
paid. The footer and the payment screen say so.

### What I chose not to build

No per-user favourites, no routing, no space-level (bay-by-bay) tracking, and no
real payment gateway or actual ANU permit issuance. The account flow models the
shape of booking and paying for parking; it does not connect to ANU's systems and
does not take real money.

## Running it

```sh
mise install && pnpm install
pnpm dev     # local dev server under the base path
pnpm check   # typecheck + build + tests against the running app
```
