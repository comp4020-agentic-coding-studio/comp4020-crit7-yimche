import type { APIRoute } from "astro";
import { createSession, setSessionCookie, verifyPassword } from "../../lib/auth";
import { findUserByEmail } from "../../lib/accounts";

// Sign an existing user in. A wrong email and a wrong password give the same
// error, so the form never reveals whether an address has an account.
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    return redirect("/login/?error=login", 303);
  }

  setSessionCookie(cookies, createSession(user.id));
  return redirect("/account/", 303);
};
