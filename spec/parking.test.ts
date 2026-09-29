import { beforeAll, describe, expect, inject, it } from "vitest";

// The week's spec, turned into contracts on the RUNNING app. These test what
// the page must DO, not how it's built: the directory carries the facts a
// driver needs, a report survives a reload (the persistence the crit asks
// for), and a report reaches other clients live over SSE. global-setup boots
// the built server with a throwaway database, freshly seeded from
// src/lib/parking-data.ts.
const baseUrl = inject("baseUrl");

// Astro rejects form POSTs without a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

const home = () => fetch(baseUrl).then((r) => r.text());

// The badge class for a given park id, e.g. "avail avail-full", read from the
// server-rendered card. This is how we prove a report actually landed.
const badgeClass = (html: string, id: string): string | undefined =>
  html.match(new RegExp(`class="(avail avail-[a-z]+)"\\s+id="avail-${id}"`))?.[1];

const firstParkId = (html: string): string => {
  const id = html.match(/data-park-id="(\d+)"/)?.[1];
  if (!id) throw new Error("no car park cards rendered");
  return id;
};

describe("parking directory", () => {
  let html: string;
  beforeAll(async () => {
    html = await home();
  });

  it("lists parking areas of each kind", () => {
    for (const category of [
      "Visitor pay parking",
      "Staff parking station",
      "Staff / student surface",
      "Resident / private",
      "Permit parking",
      "Motorbike parking",
    ]) {
      expect(html).toContain(category);
    }
  });

  it("renders the whole OpenStreetMap parking set", () => {
    // Every mapped lot becomes a card; guard against a regression that drops
    // back to a handful of hand-written entries.
    const count = (html.match(/data-park-id="\d+"/g) ?? []).length;
    expect(count).toBeGreaterThan(100);
  });

  it("exposes the data the client filter runs on", () => {
    // The search/filter is a client enhancement, but the data it needs must be
    // server-rendered: a filter mount point, and a category per card.
    expect(html).toContain('id="filters"');
    expect(html).toContain("data-category=");
    expect(html).toContain("data-search=");
  });

  it("shows every fact a driver needs", () => {
    for (const label of ["Hours", "Rate", "Permit", "Fees"]) {
      expect(html).toContain(label);
    }
  });

  it("carries the grounded 2026 rate figures", () => {
    expect(html).toContain("$7.78"); // staff surface
    expect(html).toContain("$9.59"); // staff parking station
    expect(html).toContain("$3.88"); // non-resident student
    expect(html).toContain("$4.90"); // resident student
  });

  it("names OpenStreetMap as the map source", () => {
    expect(html).toContain("openstreetmap.org");
  });
});

describe("availability reports", () => {
  it("persists a report across a reload", async () => {
    const id = firstParkId(await home());

    const res = await post(
      "/api/reports",
      new URLSearchParams({ carParkId: id, level: "full" }),
    );
    expect(res.status).toBe(303);

    expect(badgeClass(await home(), id)).toBe("avail avail-full");
  });

  it("ignores an invalid level rather than storing it", async () => {
    const id = firstParkId(await home());

    const res = await post(
      "/api/reports",
      new URLSearchParams({ carParkId: id, level: "banana" }),
    );
    expect(res.status).toBe(303);

    // the badge stays one of the known states — the junk level was dropped
    expect(badgeClass(await home(), id)).toMatch(
      /^avail avail-(plenty|some|full|none)$/,
    );
  });

  it("broadcasts a report over the SSE stream", async () => {
    const id = firstParkId(await home());

    const stream = await fetch(new URL("/api/events", baseUrl));
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("no response body");

    await post("/api/reports", new URLSearchParams({ carParkId: id, level: "some" }));

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes('"level":"some"')) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before the event arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain(`"carParkId":${id}`);
  }, 10_000);
});
