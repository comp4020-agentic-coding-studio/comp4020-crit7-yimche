import { describe, expect, inject, it } from "vitest";

// The account, car, ticket and payment systems, as contracts on the RUNNING
// app: what each flow must DO, not how it's built. The chain under test is the
// product itself — register, add a car, book a session, pay for it — plus the
// guards that keep one user out of another's data. global-setup boots the
// built server with a throwaway database.
const baseUrl = inject("baseUrl");

// Astro rejects cross-origin form POSTs, and fetch keeps no cookie jar, so we
// send the Origin header ourselves and carry the session cookie by hand.
const post = (path: string, body: URLSearchParams, cookie?: string) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: cookie
      ? { origin: baseUrl, cookie }
      : { origin: baseUrl },
    body,
    redirect: "manual",
  });

const get = (path: string, cookie?: string) =>
  fetch(new URL(path, baseUrl), {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });

// The session cookie name/value pair from a Set-Cookie, ready to send back.
const cookieFrom = (res: Response): string => {
  const raw = res.headers.get("set-cookie");
  if (!raw) throw new Error("expected a session cookie");
  return raw.split(";")[0];
};

let seq = 0;
const uniqueEmail = () => `user-${Date.now()}-${seq++}@example.com`;

// Register a fresh account and return its live session cookie.
const register = async (email: string, name = "Test Driver", password = "hunter2hunter") => {
  const res = await post(
    "/api/register",
    new URLSearchParams({ email, displayName: name, password }),
  );
  expect(res.status).toBe(303);
  return cookieFrom(res);
};

// A car-park id straight from the public directory.
const aParkId = async (): Promise<string> => {
  const html = await get("/").then((r) => r.text());
  const id = html.match(/data-park-id="(\d+)"/)?.[1];
  if (!id) throw new Error("no car parks in the directory");
  return id;
};

// The first car id offered on the (signed-in) booking form.
const aCarId = (bookHtml: string): string => {
  const id = bookHtml.match(/name="carId"[\s\S]*?<option value="(\d+)"/)?.[1];
  if (!id) throw new Error("no car on the booking form");
  return id;
};

const ticketIdFrom = (res: Response): string => {
  const id = res.headers.get("location")?.match(/\/tickets\/(\d+)\//)?.[1];
  if (!id) throw new Error(`expected a redirect to a ticket, got ${res.headers.get("location")}`);
  return id;
};

// The slice of the directory HTML for one park's card, so we can read the state
// of that card's favourite toggle without a stray match from another card.
const cardSlice = (html: string, id: string): string => {
  const start = html.indexOf(`id="park-${id}"`);
  if (start === -1) throw new Error(`no card for park ${id}`);
  const next = html.indexOf('class="park"', start + 1);
  return html.slice(start, next === -1 ? html.length : next);
};

// Whether the signed-in directory shows this park as favourited: the toggle's
// button carries aria-pressed="true" exactly when it's starred.
const isFavourited = (html: string, id: string): boolean =>
  /aria-pressed="true"/.test(cardSlice(html, id));

describe("account system", () => {
  it("registers a user, signs them in, and greets them", async () => {
    const cookie = await register(uniqueEmail(), "Ada Lovelace");
    const res = await get("/account/", cookie);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Ada Lovelace");
  });

  it("refuses a duplicate email", async () => {
    const email = uniqueEmail();
    await register(email);
    const res = await post(
      "/api/register",
      new URLSearchParams({ email, displayName: "Someone", password: "hunter2hunter" }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("error=email-taken");
  });

  it("rejects too-short passwords", async () => {
    const res = await post(
      "/api/register",
      new URLSearchParams({ email: uniqueEmail(), displayName: "Short", password: "short" }),
    );
    expect(res.headers.get("location")).toContain("error=register");
  });

  it("signs a user back in after logout", async () => {
    const email = uniqueEmail();
    const cookie = await register(email, "Grace Hopper");

    const out = await post("/api/logout", new URLSearchParams(), cookie);
    expect(out.status).toBe(303);

    const login = await post(
      "/api/login",
      new URLSearchParams({ email, password: "hunter2hunter" }),
    );
    expect(login.status).toBe(303);
    const back = await get("/account/", cookieFrom(login));
    expect(await back.text()).toContain("Grace Hopper");
  });

  it("keeps signed-out visitors out of the account and booking pages", async () => {
    expect((await get("/account/")).status).toBe(302);
    expect((await get("/book/")).status).toBe(302);
    const write = await post("/api/cars", new URLSearchParams({ plate: "X", make: "Y", model: "Z" }));
    expect(write.headers.get("location")).toContain("/login/");
  });
});

describe("cars, tickets and payment", () => {
  it("registers a car that then shows on the account", async () => {
    const cookie = await register(uniqueEmail());
    const res = await post(
      "/api/cars",
      new URLSearchParams({ plate: "abc123", make: "Toyota", model: "Corolla", colour: "red" }),
      cookie,
    );
    expect(res.status).toBe(303);
    const account = await get("/account/", cookie).then((r) => r.text());
    expect(account).toContain("ABC123"); // stored upper-cased
    expect(account).toContain("Corolla");
  });

  it("books a session, prices it on the grounded rate, and pays it", async () => {
    const cookie = await register(uniqueEmail());
    await post(
      "/api/cars",
      new URLSearchParams({ plate: "pay001", make: "Honda", model: "Jazz" }),
      cookie,
    );
    const bookHtml = await get("/book/", cookie).then((r) => r.text());
    const carId = aCarId(bookHtml);
    const parkId = await aParkId();

    const booked = await post(
      "/api/tickets",
      new URLSearchParams({ carParkId: parkId, carId, rateClass: "visitor", mode: "hourly", hours: "3" }),
      cookie,
    );
    expect(booked.status).toBe(303);
    const ticketId = ticketIdFrom(booked);

    // Reserved: visitor $3.07/hour x 3 = $9.21, and it says the payment is simulated.
    const reserved = await get(`/tickets/${ticketId}/`, cookie).then((r) => r.text());
    expect(reserved).toContain("Awaiting payment");
    expect(reserved).toContain("$9.21");
    expect(reserved.toLowerCase()).toContain("simulated");

    const paid = await post("/api/pay", new URLSearchParams({ ticketId }), cookie);
    expect(paid.status).toBe(303);

    const after = await get(`/tickets/${ticketId}/`, cookie).then((r) => r.text());
    expect(after).toContain("Paid");
    expect(after).not.toContain("Awaiting payment");
  });

  it("stars a car park, lists it on the account, and unstars it", async () => {
    const cookie = await register(uniqueEmail());
    const parkId = await aParkId();

    // Star it.
    const on = await post(
      "/api/favourites",
      new URLSearchParams({ carParkId: parkId, on: "1" }),
      cookie,
    );
    expect(on.status).toBe(303);

    // The directory now shows this card favourited for this user...
    const dir = await get("/", cookie).then((r) => r.text());
    expect(isFavourited(dir, parkId)).toBe(true);
    // ...and the account page lists it, linking back to its card.
    const account = await get("/account/", cookie).then((r) => r.text());
    expect(account).toContain("Your favourite car parks");
    expect(account).toContain(`/#park-${parkId}`);

    // Unstar it: the card goes back to un-favourited.
    const off = await post(
      "/api/favourites",
      new URLSearchParams({ carParkId: parkId, on: "0" }),
      cookie,
    );
    expect(off.status).toBe(303);
    const dir2 = await get("/", cookie).then((r) => r.text());
    expect(isFavourited(dir2, parkId)).toBe(false);
  });

  it("exposes favourite state so the map popup and filter can read it", async () => {
    // The popup star and the favourites-only filter are client enhancements, so
    // they can't run under fetch. What we can hold is the contract they stand on:
    // signed in, the page announces it and tags the starred card, so the script
    // has the truth to filter and pre-fill the popup toggle from.
    const cookie = await register(uniqueEmail());
    const parkId = await aParkId();
    await post(
      "/api/favourites",
      new URLSearchParams({ carParkId: parkId, on: "1" }),
      cookie,
    );

    const dir = await get("/", cookie).then((r) => r.text());
    expect(dir).toContain('data-signed-in="1"');
    expect(cardSlice(dir, parkId)).toContain('data-fav="1"');

    // Signed out, the page says so, and no card is pre-marked as a favourite.
    const anon = await get("/").then((r) => r.text());
    expect(anon).toContain('data-signed-in="0"');
    expect(anon).not.toContain('data-fav="1"');
  });

  it("keeps favourites private and behind sign-in", async () => {
    const parkId = await aParkId();

    // A signed-out write is refused and sent to the login page.
    const refused = await post(
      "/api/favourites",
      new URLSearchParams({ carParkId: parkId, on: "1" }),
    );
    expect(refused.headers.get("location")).toContain("/login/");

    // One user's favourite doesn't show on another user's directory.
    const a = await register(uniqueEmail());
    await post(
      "/api/favourites",
      new URLSearchParams({ carParkId: parkId, on: "1" }),
      a,
    );
    const b = await register(uniqueEmail());
    const bDir = await get("/", b).then((r) => r.text());
    expect(isFavourited(bDir, parkId)).toBe(false);
  });

  it("won't let one user see or pay another's ticket", async () => {
    const owner = await register(uniqueEmail());
    await post(
      "/api/cars",
      new URLSearchParams({ plate: "own001", make: "Mazda", model: "3" }),
      owner,
    );
    const carId = aCarId(await get("/book/", owner).then((r) => r.text()));
    const parkId = await aParkId();
    const booked = await post(
      "/api/tickets",
      new URLSearchParams({ carParkId: parkId, carId, rateClass: "staff-student", mode: "all-day", hours: "1" }),
      owner,
    );
    const ticketId = ticketIdFrom(booked);

    const intruder = await register(uniqueEmail());
    // Can't read it.
    expect((await get(`/tickets/${ticketId}/`, intruder)).status).toBe(404);
    // Can't pay it.
    const steal = await post("/api/pay", new URLSearchParams({ ticketId }), intruder);
    expect(steal.headers.get("location")).toContain("error=pay");
    // The owner's ticket is untouched.
    const still = await get(`/tickets/${ticketId}/`, owner).then((r) => r.text());
    expect(still).toContain("Awaiting payment");
  });
});
