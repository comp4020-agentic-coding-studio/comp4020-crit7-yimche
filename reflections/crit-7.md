# Crit 7 reflection

## What I set out to do

Build the ANU system I wish existed, as a real full-stack slice that persists.
I picked campus parking because the pain is concrete: the facts you need are
scattered, and nothing tells you where there's actually room. The slice I chose,
"read the facts, report the state," is small enough to finish and squarely on the
week's theme of schemas, SQLite and migrations.

## What went well

Designing the data first paid off. Once `car_parks` and `reports` existed with a
foreign key between them, the rest fell out naturally: the directory reads the
join, the form writes a report, and the same SSE bus the starter shipped carried
the live update with almost no new plumbing. Keeping the directory functional
without JavaScript meant the map could be a genuine enhancement rather than a
dependency, and it kept the accessibility floor green for free.

## What was harder than expected

Deciding how honest to be about the data. It would have been easy to write
confident-looking car-park names and coordinates and let them read as fact. The
rates I could ground in ANU's 2026 fee schedule; the exact locations I could not,
without a survey. I chose to label the placeholders plainly in three places
rather than hide the seam. That is the right call for a prototype, but it is a
reminder that a convincing UI can launder a guess into an apparent fact.

## What I'd do next

Replace the placeholder coordinates and names with real ones from the ANU permit
zone map, add a light decay so stale reports fade rather than mislead, and give
each car park its own detail route (adding it to `spec/routes.ts`). If it were to
carry real trust, availability would need some corroboration, not a single
unverified tap.

## On directing the agent

The useful moments were the ones where I set a constraint and made the agent
carry it: ground the rates or label them, keep the no-JS path working, test the
contract and not the construction. The correction that mattered was catching the
Leaflet typing error early through `pnpm check` rather than at deploy, which is
the argument for keeping the check green as you go rather than at the end.
