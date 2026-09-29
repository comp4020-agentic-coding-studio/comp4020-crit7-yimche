import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { CAR_PARKS } from "./parking-data";
import { type CarPark, carParks, type Report, reports } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// Seed the reference data on every boot, idempotently. The car-park facts live
// in source (parking-data.ts) and are the ground truth; the slug is their
// stable identity. A new car park in the seed is inserted; an existing one has
// its facts (name, position, rate, permit, notes, capacity) re-synced from
// source, so correcting a coordinate or a rate here reaches an already-seeded
// volume on the next boot. The row id never changes, so the live reports that
// point at a car park stay attached across the update. A car park dropped from
// the seed (e.g. clipped as off-campus) is removed from an already-seeded
// volume too, so the source stays the single source of truth for which lots
// exist; its reports go with it, since a report only means something attached
// to a lot the app still shows.
function seed(): void {
  const slugs = CAR_PARKS.map((p) => p.slug);
  // Remove any car park no longer in the seed. Its reports reference its id, so
  // they go first; then the park itself.
  const stale = db
    .select({ id: carParks.id })
    .from(carParks)
    .where(notInArray(carParks.slug, slugs))
    .all()
    .map((row) => row.id);
  if (stale.length > 0) {
    db.delete(reports).where(inArray(reports.carParkId, stale)).run();
    db.delete(carParks).where(inArray(carParks.id, stale)).run();
  }

  const insert = db
    .insert(carParks)
    .values(
      CAR_PARKS.map((p) => ({
        slug: p.slug,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        hours: p.hours,
        rate: p.rate,
        permit: p.permit,
        fees: p.fees,
        notes: p.notes ?? null,
        capacity: p.capacity ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: carParks.slug,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        hours: sql`excluded.hours`,
        rate: sql`excluded.rate`,
        permit: sql`excluded.permit`,
        fees: sql`excluded.fees`,
        notes: sql`excluded.notes`,
        capacity: sql`excluded.capacity`,
      },
    });
  insert.run();
}
seed();

export type { CarPark, Report };

// The availability levels a report may carry, worst-known-first for display.
export const LEVELS = ["plenty", "some", "full"] as const;
export type Level = (typeof LEVELS)[number];

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

export type CarParkWithLatest = CarPark & { latest: Report | null };

// The most recent report for each car park, in one pass. Report volume is
// small, so we read them newest-first and keep the first we see per park
// rather than issuing a query per car park.
function latestByPark(): Map<number, Report> {
  const rows = db.select().from(reports).orderBy(desc(reports.id)).all();
  const latest = new Map<number, Report>();
  for (const row of rows) {
    if (!latest.has(row.carParkId)) latest.set(row.carParkId, row);
  }
  return latest;
}

export function listCarParks(): CarParkWithLatest[] {
  const latest = latestByPark();
  return db
    .select()
    .from(carParks)
    .orderBy(carParks.name)
    .all()
    .map((park) => ({ ...park, latest: latest.get(park.id) ?? null }));
}

export function getCarPark(id: number): CarPark | undefined {
  return db.select().from(carParks).where(eq(carParks.id, id)).get();
}

// A report, plus the slug and name of the park it belongs to, so the SSE
// consumer can find the right card and marker without a second round trip.
export type ReportEvent = Report & { parkSlug: string; parkName: string };

export function addReport(carParkId: number, level: Level): ReportEvent | null {
  const park = getCarPark(carParkId);
  if (!park) return null;
  const row = db.insert(reports).values({ carParkId, level }).returning().get();
  return { ...row, parkSlug: park.slug, parkName: park.name };
}
