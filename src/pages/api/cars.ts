import type { APIRoute } from "astro";
import { currentUser } from "../../lib/auth";
import { addCar } from "../../lib/accounts";

// Register a car against the signed-in user. Guarded: no session, no write.
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const user = currentUser(cookies);
  if (!user) return redirect("/login/?error=auth", 303);

  const form = await request.formData();
  const plate = String(form.get("plate") ?? "").trim().toUpperCase();
  const make = String(form.get("make") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  const colour = String(form.get("colour") ?? "").trim();

  if (!plate || !make || !model) {
    return redirect("/account/?error=car#add-car", 303);
  }

  addCar(user.id, { plate, make, model, colour: colour || null });
  return redirect("/account/#cars", 303);
};
