import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { createTicket } from "../../lib/accounts";

// Book a reserved (unpaid) parking session for the signed-in user, then send
// them to the ticket, where they can pay. createTicket re-validates everything
// server-side, so a forged POST can't book another user's car or an unknown
// park; here we only route its result.
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const user = currentUser(cookies);
  if (!user) return redirect("/login/?error=auth", 303);

  const form = await request.formData();
  const result = createTicket(user.id, {
    carId: Number(form.get("carId")),
    carParkId: Number(form.get("carParkId")),
    rateClass: String(form.get("rateClass") ?? ""),
    mode: String(form.get("mode") ?? ""),
    hours: Number(form.get("hours") ?? 0),
  });

  if (!result.ok) return redirect(`/book/?error=${result.error}`, 303);
  return redirect(`/tickets/${result.id}/`, 303);
};
