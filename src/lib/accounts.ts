import { and, desc, eq, sql } from "drizzle-orm";
import { hashPassword } from "./auth";
import { db, getCarPark } from "./db";
import {
  type Car,
  type CarPark,
  type Ticket,
  type User,
  carParks,
  cars,
  favourites,
  payments,
  tickets,
  users,
} from "./schema";
import { MAX_HOURS, type Mode, isMode, priceCents, rateClass } from "./pricing";

// The queries behind the account system. Kept apart from db.ts (which owns the
// parking reference data) so each module stays small and single-purpose. Every
// write that belongs to a user takes the user id and scopes to it, so one
// person can never read or change another's cars, tickets or payments.

// ---- Users --------------------------------------------------------------

export function findUserByEmail(email: string): User | undefined {
  return db.select().from(users).where(eq(users.email, email)).get();
}

// Create an account with a hashed password. The caller checks for a duplicate
// email first for a friendly message; the unique index is the real guard.
export function createUser(
  email: string,
  displayName: string,
  password: string,
): User {
  const { hash, salt } = hashPassword(password);
  return db
    .insert(users)
    .values({ email, displayName, passwordHash: hash, passwordSalt: salt })
    .returning()
    .get();
}

// ---- Cars ---------------------------------------------------------------

export function listCars(userId: number): Car[] {
  return db
    .select()
    .from(cars)
    .where(eq(cars.userId, userId))
    .orderBy(cars.plate)
    .all();
}

// A car the given user owns, or undefined. Scoping by user id here is what
// stops a booking pointing at someone else's car.
export function getUserCar(userId: number, carId: number): Car | undefined {
  return db
    .select()
    .from(cars)
    .where(and(eq(cars.id, carId), eq(cars.userId, userId)))
    .get();
}

export function addCar(
  userId: number,
  fields: { plate: string; make: string; model: string; colour: string | null },
): Car {
  return db
    .insert(cars)
    .values({ userId, ...fields })
    .returning()
    .get();
}

// ---- Tickets ------------------------------------------------------------

export type TicketDraft = {
  carId: number;
  carParkId: number;
  rateClass: string;
  mode: string;
  hours: number;
};

export type Created =
  | { ok: true; id: number }
  | { ok: false; error: string };

// Book a reserved (unpaid) session. Everything the form sends is re-checked
// against the database and the grounded rate table, so a hand-crafted POST
// can't book another user's car, an unknown car park, an unknown rate, or a
// duration outside the enforced window. The price is computed here and frozen
// onto the row.
export function createTicket(userId: number, draft: TicketDraft): Created {
  if (!getUserCar(userId, draft.carId)) return { ok: false, error: "car" };
  if (!getCarPark(draft.carParkId)) return { ok: false, error: "park" };

  const cls = rateClass(draft.rateClass);
  if (!cls) return { ok: false, error: "rate" };
  if (!isMode(draft.mode)) return { ok: false, error: "mode" };

  const mode: Mode = draft.mode;
  const hours =
    mode === "all-day"
      ? MAX_HOURS
      : Math.trunc(draft.hours);
  if (mode === "hourly" && (hours < 1 || hours > MAX_HOURS)) {
    return { ok: false, error: "hours" };
  }

  const row = db
    .insert(tickets)
    .values({
      userId,
      carId: draft.carId,
      carParkId: draft.carParkId,
      rateClass: cls.id,
      mode,
      hours,
      priceCents: priceCents(cls, mode, hours),
      expiresAt: sql`(datetime('now', ${`+${hours} hours`}))`,
    })
    .returning()
    .get();
  return { ok: true, id: row.id };
}

// A ticket with the names it points at, so a page can show "at <park> in
// <car>" without three lookups. Scoped to the owner: asking for someone else's
// ticket returns undefined, which the page turns into a 404.
export type TicketView = Ticket & { parkName: string; carPlate: string };

export function getUserTicket(
  userId: number,
  ticketId: number,
): TicketView | undefined {
  return db
    .select({
      ...ticketColumns(),
      parkName: carParks.name,
      carPlate: cars.plate,
    })
    .from(tickets)
    .innerJoin(carParks, eq(tickets.carParkId, carParks.id))
    .innerJoin(cars, eq(tickets.carId, cars.id))
    .where(and(eq(tickets.id, ticketId), eq(tickets.userId, userId)))
    .get();
}

export function listUserTickets(userId: number): TicketView[] {
  return db
    .select({
      ...ticketColumns(),
      parkName: carParks.name,
      carPlate: cars.plate,
    })
    .from(tickets)
    .innerJoin(carParks, eq(tickets.carParkId, carParks.id))
    .innerJoin(cars, eq(tickets.carId, cars.id))
    .where(eq(tickets.userId, userId))
    .orderBy(desc(tickets.id))
    .all();
}

// The ticket table's own columns, so the joined selects above pick exactly the
// ticket fields and add the two names, with no column-name clashes.
function ticketColumns() {
  return {
    id: tickets.id,
    userId: tickets.userId,
    carId: tickets.carId,
    carParkId: tickets.carParkId,
    rateClass: tickets.rateClass,
    mode: tickets.mode,
    hours: tickets.hours,
    priceCents: tickets.priceCents,
    status: tickets.status,
    startsAt: tickets.startsAt,
    expiresAt: tickets.expiresAt,
    createdAt: tickets.createdAt,
  };
}

// ---- Favourites ---------------------------------------------------------
// A user can star car parks to find them again fast. Favourites are private and
// scoped to the user, the same way cars and tickets are.

// The ids of the car parks a user has starred, as a Set, so a page rendering
// the whole directory can ask "is this one favourited?" in O(1) per card.
export function listFavouriteIds(userId: number): Set<number> {
  const rows = db
    .select({ carParkId: favourites.carParkId })
    .from(favourites)
    .where(eq(favourites.userId, userId))
    .all();
  return new Set(rows.map((r) => r.carParkId));
}

// The favourited car parks themselves, with their facts, newest star first, for
// the account page. Scoped to the owner.
export function listFavouriteParks(userId: number): CarPark[] {
  return db
    .select({ park: carParks })
    .from(favourites)
    .innerJoin(carParks, eq(favourites.carParkId, carParks.id))
    .where(eq(favourites.userId, userId))
    .orderBy(desc(favourites.id))
    .all()
    .map((r) => r.park);
}

// Star a car park for a user. Idempotent: the unique (user, park) index means a
// double submit or a stale tab can't create a duplicate, so a repeat is a no-op
// rather than an error. Returns false only if the car park doesn't exist.
export function addFavourite(userId: number, carParkId: number): boolean {
  if (!getCarPark(carParkId)) return false;
  db.insert(favourites)
    .values({ userId, carParkId })
    .onConflictDoNothing()
    .run();
  return true;
}

// Unstar a car park. A no-op if it wasn't favourited.
export function removeFavourite(userId: number, carParkId: number): void {
  db.delete(favourites)
    .where(
      and(eq(favourites.userId, userId), eq(favourites.carParkId, carParkId)),
    )
    .run();
}

// ---- Payments -----------------------------------------------------------

// Settle a reserved ticket with a simulated payment. Wrapped in a transaction
// so the ticket only flips to "paid" if the payment row is written, and the
// unique ticket_id means a double submit can't pay twice. Returns false when
// the ticket isn't the user's, doesn't exist, or is already paid.
export function payTicket(userId: number, ticketId: number): boolean {
  return db.transaction((tx) => {
    const ticket = tx
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.userId, userId)))
      .get();
    if (!ticket || ticket.status !== "reserved") return false;

    tx.insert(payments)
      .values({ ticketId: ticket.id, userId, amountCents: ticket.priceCents })
      .run();
    tx.update(tickets)
      .set({ status: "paid" })
      .where(eq(tickets.id, ticket.id))
      .run();
    return true;
  });
}
