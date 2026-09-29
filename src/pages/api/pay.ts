import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { payTicket } from "../../lib/accounts";

// Settle a ticket with a SIMULATED payment: no card is taken and no money
// moves. payTicket only succeeds for a reserved ticket the signed-in user owns,
// so this can neither pay someone else's ticket nor double-pay one.
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const user = currentUser(cookies);
  if (!user) return redirect("/login/?error=auth", 303);

  const form = await request.formData();
  const ticketId = Number(form.get("ticketId"));

  if (!payTicket(user.id, ticketId)) {
    return redirect("/account/?error=pay", 303);
  }
  return redirect(`/tickets/${ticketId}/`, 303);
};
