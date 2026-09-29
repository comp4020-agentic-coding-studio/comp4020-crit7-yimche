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

// ---- Accounts, vehicles, tickets and payments --------------------------
// The people-facing half of the app, added on top of the reference data. A
// user registers, adds one or more of their cars, then books a casual parking
// session (a "ticket") at a car park for one of their cars and pays for it.
// The whole chain is state, so it all lives here in the schema, the same way
// car parks and reports do. Passwords are never stored in the clear: only a
// scrypt hash and its per-user salt (see src/lib/auth.ts).

export const users = sqliteTable("users", {
  id: int().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// A signed-in session is an opaque random token in an httpOnly cookie, backed
// by this row so we can expire it and revoke it on logout. The token itself is
// the primary key; nothing guessable maps to a user.
export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  expiresAt: text("expires_at").notNull(),
});

// A car belongs to exactly one user. Plate, make and model are required; the
// colour is optional. These are the details a permit or an inspector would
// check a ticket against.
export const cars = sqliteTable("cars", {
  id: int().primaryKey({ autoIncrement: true }),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  plate: text().notNull(),
  make: text().notNull(),
  model: text().notNull(),
  colour: text(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// A ticket is a booked casual parking session: a user parking one of their
// cars at a car park for a window of time, priced on ANU's published PayStay
// pay-as-you-go rates (see src/lib/pricing.ts). It is created "reserved" and
// becomes "paid" once its payment settles. The price is frozen onto the row at
// booking time, so a later rate change never rewrites an issued ticket.
export const tickets = sqliteTable("tickets", {
  id: int().primaryKey({ autoIncrement: true }),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  carId: int("car_id")
    .notNull()
    .references(() => cars.id),
  carParkId: int("car_park_id")
    .notNull()
    .references(() => carParks.id),
  rateClass: text("rate_class").notNull(),
  mode: text().notNull(),
  hours: int().notNull(),
  priceCents: int("price_cents").notNull(),
  status: text().notNull().default("reserved"),
  startsAt: text("starts_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// One payment settles one ticket. It is deliberately a *simulated* payment: the
// prototype records that a charge of a given amount was made, but takes no card
// details and moves no money. The unique ticket_id makes double-paying a ticket
// impossible at the database level.
export const payments = sqliteTable("payments", {
  id: int().primaryKey({ autoIncrement: true }),
  ticketId: int("ticket_id")
    .notNull()
    .unique()
    .references(() => tickets.id),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  amountCents: int("amount_cents").notNull(),
  method: text().notNull().default("simulated"),
  status: text().notNull().default("paid"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type CarPark = typeof carParks.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Car = typeof cars.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Payment = typeof payments.$inferSelect;
