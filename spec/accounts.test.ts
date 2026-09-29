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
