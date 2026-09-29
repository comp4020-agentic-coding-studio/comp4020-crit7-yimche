import { and, desc, eq, sql } from "drizzle-orm";
import { hashPassword } from "./auth";
import { db, getCarPark } from "./db";
import {
  type Car,
  type Ticket,
  type User,
  carParks,
  cars,
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
