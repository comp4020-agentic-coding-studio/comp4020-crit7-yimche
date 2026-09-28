import { sql } from "drizzle-orm";
import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// The reference data: every parking area on campus, with the facts a driver
// needs before they arrive — where it is, when it's enforced, what it costs,
// and which permit (if any) it wants. Seeded from src/lib/parking-data.ts on
// first boot (see db.ts); the seed is the ground truth for the *facts*, this
// table is where they live so reports can point at them.
export const carParks = sqliteTable("car_parks", {
  id: int().primaryKey({ autoIncrement: true }),
  slug: text().notNull().unique(),
  name: text().notNull(),
  category: text().notNull(),
  lat: real().notNull(),
  lng: real().notNull(),
  hours: text().notNull(),
  rate: text().notNull(),
  permit: text().notNull(),
  fees: text().notNull(),
  notes: text(),
  capacity: int(),
});

// The live half: a crowd-sourced note of how full a car park is right now.
// This is the state that grows while the app runs — every report persists and
// points back at a car park, and the most recent one per park is what the map
// and the directory show.
export const reports = sqliteTable("reports", {
  id: int().primaryKey({ autoIncrement: true }),
  carParkId: int("car_park_id")
    .notNull()
    .references(() => carParks.id),
  level: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type CarPark = typeof carParks.$inferSelect;
export type Report = typeof reports.$inferSelect;
