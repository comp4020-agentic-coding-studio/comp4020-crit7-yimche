import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { type User, sessions, users } from "./schema";

// Authentication for the account system. Two jobs live here: turning a password
// into something safe to store, and turning a request's cookie into the user it
// belongs to. Everything else (the account pages, the booking flow) trusts
// `currentUser` and never touches passwords or the sessions table directly.

const COOKIE = "pk_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// scrypt is a deliberately slow, memory-hard hash: the right tool for passwords
// where a fast hash (SHA-256) would be brute-forceable. Each user gets a random
// salt so identical passwords hash differently and a stolen table can't be
// attacked with one rainbow table.
export function hashPassword(password: string): {
  hash: string;
  salt: string;
} {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

// Compared in constant time so a caller can't learn the hash byte by byte from
// how long the check takes.
export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): boolean {
  const attempt = scryptSync(password, salt, 64);
  const known = Buffer.from(hash, "hex");
  return (
    attempt.length === known.length && timingSafeEqual(attempt, known)
  );
}

// A session is a 256-bit random token, unguessable and stored server-side so we
// can expire and revoke it. The token is all the browser ever holds.
export function createSession(userId: number): string {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.insert(sessions).values({ id, userId, expiresAt }).run();
  return id;
}

export function deleteSession(id: string): void {
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

// The session cookie: httpOnly so client scripts can't read the token, SameSite
// Lax to blunt CSRF, and Secure in production (Fly serves over HTTPS). In local
// dev over http, Secure would stop the cookie being set, so it's off there.
export function setSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: import.meta.env.PROD,
    maxAge: SESSION_TTL_MS / 1000,
  });
}

// Sign the browser out: drop the server-side session and clear the cookie.
export function clearSession(cookies: AstroCookies): void {
  const token = cookies.get(COOKIE)?.value;
  if (token) deleteSession(token);
  cookies.delete(COOKIE, { path: "/" });
}

// The one function pages and endpoints call: who, if anyone, is signed in. An
// expired session is treated as signed-out and cleaned up on the way past.
export function currentUser(cookies: AstroCookies): User | null {
  const token = cookies.get(COOKIE)?.value;
  if (!token) return null;

  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.id, token))
    .get();
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }

  return (
    db.select().from(users).where(eq(users.id, session.userId)).get() ?? null
  );
}
