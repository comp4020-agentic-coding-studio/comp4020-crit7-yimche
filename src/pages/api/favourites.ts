import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { addFavourite, removeFavourite } from "../../lib/accounts";

// Star or unstar a car park for the signed-in user. A plain form on each
// directory card (and in each map marker popup) POSTs here, carrying the park id
// and whether to turn the favourite on (the button renders the opposite of the
// current state). Favourites are private, so there's no broadcast: just a write.
//
// No JavaScript: the form submits normally and we 303 back to the card, exactly
// like the availability report beside it. With JavaScript: the client sends this
// in the background (marked with X-Requested-With) and flips the star in place,
// so we answer 204 and the page never navigates or jumps to the toggled card.
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const background = request.headers.get("x-requested-with") === "fetch";
  const user = currentUser(cookies);
  if (!user) {
    return background
      ? new Response(null, { status: 401 })
      : redirect("/login/?error=auth", 303);
  }

  const form = await request.formData();
  const carParkId = Number(form.get("carParkId"));
  const on = String(form.get("on") ?? "") === "1";

  if (Number.isInteger(carParkId)) {
    if (on) addFavourite(user.id, carParkId);
    else removeFavourite(user.id, carParkId);
  }

  // A background toggle updates itself, so it needs no body and no redirect.
  if (background) return new Response(null, { status: 204 });

  // Back to the park's card, so a no-JS submit lands where it started.
  return redirect(`/#park-${carParkId}`, 303);
};
