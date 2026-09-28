import type { APIRoute } from "astro";
import { addReport, isLevel } from "../../lib/db";
import { bus } from "../../lib/events";

// The write half of the app: a plain HTML form on each car-park card POSTs
// here with a park id and an availability level. The report goes into SQLite
// and the new row is broadcast to every open SSE connection. The 303 redirect
// makes the form work with no client-side JavaScript at all — the submitting
// tab re-renders from the database with its report already applied; every
// *other* tab hears about it over the stream.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const carParkId = Number(form.get("carParkId"));
  const level = String(form.get("level") ?? "");

  if (Number.isInteger(carParkId) && isLevel(level)) {
    const event = addReport(carParkId, level);
    if (event) bus.emit("report", event);
  }

  // Back to the reported park's card, so a no-JS submit lands where it started.
  return redirect(`/#park-${carParkId}`, 303);
};
