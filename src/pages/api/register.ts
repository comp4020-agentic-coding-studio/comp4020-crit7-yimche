import type { APIRoute } from "astro";
import { createSession, setSessionCookie } from "../../lib/auth";
import { createUser, findUserByEmail } from "../../lib/accounts";

// Create an account from the register form, then sign the new user straight in.
// Like every write in this app it's a plain POST that ends in a 303 redirect,
// so it works with no client-side JavaScript. Validation failures bounce back
// to the form with an error code the page turns into a message.
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const displayName = String(form.get("displayName") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email.includes("@") || !displayName || password.length < 8) {
    return redirect("/login/?error=register#register", 303);
  }
  if (findUserByEmail(email)) {
    return redirect("/login/?error=email-taken#register", 303);
  }

  const user = createUser(email, displayName, password);
  setSessionCookie(cookies, createSession(user.id));
  return redirect("/account/", 303);
};
