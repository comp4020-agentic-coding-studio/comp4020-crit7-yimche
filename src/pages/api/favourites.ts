import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { addFavourite, removeFavourite } from "../../lib/accounts";

// Star or unstar a car park for the signed-in user. A plain form on each
// directory card POSTs here, carrying the park id and whether to turn the
// favourite on (the button renders the opposite of the current state). The 303
// redirect back to the card makes it work with no JavaScript, exactly like the
// availability report beside it. Favourites are private, so there's no
// broadcast: just a write and a reload.
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const user = currentUser(cookies);
  if (!user) return redirect("/login/?error=auth", 303);

  const form = await request.formData();
  const carParkId = Number(form.get("carParkId"));
  const on = String(form.get("on") ?? "") === "1";

  if (Number.isInteger(carParkId)) {
    if (on) addFavourite(user.id, carParkId);
    else removeFavourite(user.id, carParkId);
  }

  // Back to the park's card, so a no-JS submit lands where it started.
  return redirect(`/#park-${carParkId}`, 303);
};
