import type { APIRoute } from "astro";
import { clearSession } from "../../lib/auth";

// Sign out: drop the server-side session and clear the cookie, then home. A
// POST (not a link) so it can't be triggered by a stray GET or a prefetch.
export const POST: APIRoute = ({ redirect, cookies }) => {
  clearSession(cookies);
  return redirect("/", 303);
};
