import fs from "node:fs";

const parking = JSON.parse(fs.readFileSync(new URL("./osm/parking.json", import.meta.url), "utf8")).elements
  .map((e) => ({ c: e.center || { lat: e.lat, lon: e.lon }, t: e.tags || {}, type: e.type, id: e.id }))
  .filter((e) => e.c && e.c.lat);

const landmarks = JSON.parse(fs.readFileSync(new URL("./osm/landmarks.json", import.meta.url), "utf8")).elements
  .map((e) => ({ c: e.center || { lat: e.lat, lon: e.lon }, t: e.tags || {} }))
  .filter((e) => e.c && e.c.lat && e.t.name && e.t.amenity !== "parking");

const R = 6371000, rad = (x) => (x * Math.PI) / 180;
function dist(a, b, c, d) {
  const dl = rad(c - a), dg = rad(d - b);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Dedupe: OSM maps some lots as a relation plus its member ways, or stacks a
// node on a polygon. Keep the richest element (named > relation > way > node,
// more tags win) and drop any other parking centre within 15m of a kept one.
const score = (e) =>
  (e.t.name ? 100 : 0) +
  (e.type === "relation" ? 20 : e.type === "way" ? 10 : 0) +
  Object.keys(e.t).length;
parking.sort((a, b) => score(b) - score(a));
const kept = [];
for (const e of parking) {
  // Only merge duplicates of the same amenity, so a motorcycle_parking bay
  // sitting on top of a car park is kept as its own entry, not swallowed.
  if (kept.some((k) => k.t.amenity === e.t.amenity && dist(k.c.lat, k.c.lon, e.c.lat, e.c.lon) < 15)) continue;
  kept.push(e);
}

// Priority for the "near X" label: residential halls/colleges first, then
// named teaching buildings, then anything else named.
function landmarkRank(t) {
  if (/hall|college|lodge|house|village|burgmann|garran|wamburun|yukeembruk/i.test(t.name)) return 3;
  if (t.building && t.building !== "yes") return 2;
  if (t.building) return 1;
  return 1;
}
function nearestLandmark(lat, lon) {
  let best = null, bd = 220;
  for (const l of landmarks) {
    const d = dist(lat, lon, l.c.lat, l.c.lon);
    if (d > 220) continue;
    // Rank-weighted distance so a nearby hall beats a marginally closer shed.
    const eff = d - landmarkRank(l.t) * 25;
    if (!best || eff < bd) { bd = eff; best = { name: l.t.name, d }; }
  }
  return best;
}

// Map OSM access/fee/type onto a small, filterable category vocabulary and the
// ANU 2026 fee scheme. Rate strings deliberately carry the published figures.
const RATES = {
  visitor: "Casual PayStay, charged by the hour up to a daily cap.",
  surface: "Permit parking in enforced hours. 2026 rates: staff surface $7.78/day, non-resident student $3.88/day.",
  permit: "Permit zone. 2026 rates by permit: staff surface $7.78/day, staff parking station $9.59/day, student $3.88/day, resident $4.90/day.",
  station: "$9.59 / day (2026 staff parking-station rate).",
  private: "Private access. Resident permit $4.90/day (2026) where applicable; otherwise not public parking.",
  free: "Free.",
  motorbike: "Free for motorbikes and scooters.",
  customer: "For patrons of the adjacent facility; check the on-site signage.",
};
const HOURS = {
  enforced: "Enforced 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
  always: "Available at all times.",
  private: "Private access; permit required at all times.",
  customer: "While attending the adjacent facility.",
};

function classify(t) {
  const fee = t.fee;
  const type = t.parking;
  const access = t.access;
  if (t.amenity === "motorcycle_parking")
    return { category: "Motorbike parking", rate: RATES.motorbike, permit: "None required for motorbikes and scooters.", hours: HOURS.always };
  if (access === "private")
    return { category: "Resident / private", rate: RATES.private, permit: "Private or resident permit.", hours: HOURS.private };
  if (access === "customers")
    return { category: "Customer parking", rate: RATES.customer, permit: "Customers of the adjacent facility.", hours: HOURS.customer };
  if (access === "permit")
    return { category: "Permit parking", rate: RATES.permit, permit: "A valid ANU permit for this zone.", hours: HOURS.enforced };
  // access yes / permissive / unmarked
  if (fee === "yes") {
    if (type === "multi-storey" || type === "underground")
      return { category: "Staff parking station", rate: RATES.station, permit: "Staff parking-station permit, or casual pay where signed.", hours: HOURS.enforced };
    return { category: "Visitor pay parking", rate: RATES.visitor, permit: "None — anyone may pay and park.", hours: HOURS.enforced };
  }
  if (fee === "no")
    return { category: "Free parking", rate: RATES.free, permit: "None.", hours: HOURS.always };
  // unmarked: default to the campus staff/student surface interpretation
  return { category: "Staff / student surface", rate: RATES.surface, permit: "Staff or student surface permit.", hours: HOURS.enforced };
}

function slugify(s) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

const seen = new Map();
const out = [];
for (const e of kept) {
  const t = e.t, cls = classify(t);
  const near = t.name ? null : nearestLandmark(e.c.lat, e.c.lon);
  const typeWord =
    t.amenity === "motorcycle_parking" ? "Motorcycle parking"
    : t.parking === "multi-storey" ? "Multi-storey parking"
    : t.parking === "underground" ? "Underground parking"
    : "Surface parking";
  const name = t.name
    ? t.name
    : near
      ? `${typeWord} near ${near.name}`
      : `${typeWord} (Acton campus)`;

  let slug = slugify(name);
  const n = (seen.get(slug) || 0) + 1;
  seen.set(slug, n);
  if (n > 1) slug = `${slug}-${n}`;

  const cap = t.capacity && /^\d+$/.test(t.capacity) ? Number(t.capacity) : undefined;
  const disabled = t["capacity:disabled"] && /^\d+$/.test(t["capacity:disabled"]) ? Number(t["capacity:disabled"]) : 0;

  const noteBits = [];
  if (near) noteBits.push(`Beside ${near.name}.`);
  if (t.surface) noteBits.push(`${t.surface.replace(/_/g, " ")} surface.`);
  if (disabled > 0) noteBits.push(`${disabled} marked accessible ${disabled === 1 ? "bay" : "bays"}.`);
  noteBits.push("Mapped in OpenStreetMap.");

  const feeBits = [];
  feeBits.push(t.access ? `OSM access: ${t.access}.` : "OSM records no access restriction.");
  if (t.fee) feeBits.push(`Fee: ${t.fee}.`);
  if (t.parking) feeBits.push(`Type: ${t.parking.replace(/_/g, " ")}.`);

  out.push({
    slug,
    name,
    category: cls.category,
    lat: Number(e.c.lat.toFixed(5)),
    lng: Number(e.c.lon.toFixed(5)),
    hours: cls.hours,
    rate: cls.rate,
    permit: cls.permit,
    fees: feeBits.join(" "),
    notes: noteBits.join(" "),
    capacity: cap,
  });
}

// Stable, readable order: by category then name.
out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

const byCat = {};
for (const p of out) byCat[p.category] = (byCat[p.category] || 0) + 1;
console.error("entries:", out.length);
console.error("by category:", JSON.stringify(byCat, null, 0));
for (const f of ["$7.78", "$9.59", "$3.88", "$4.90"])
  console.error(`  rate ${f} present:`, out.some((p) => p.rate.includes(f)));

const header = `// Seed data: the parking areas on the ANU Acton campus.
//
// GENERATED FROM OPENSTREETMAP. Every entry is a distinct parking feature that
// OpenStreetMap records inside the Acton campus (© OpenStreetMap
// contributors): amenity=parking (and amenity=motorcycle_parking for the
// two-wheel bays), de-duplicated so a lot mapped as both a relation and its
// member ways appears once. Each entry's lat/lng is the centre of that feature,
// the same data the map draws, so every pin sits on a real mapped lot. Capacity
// and accessible-bay counts are shown only where OSM records them.
//
// RATES are ANU's published 2026 parking fees — staff surface $7.78/day,
// staff parking stations $9.59/day, non-resident student $3.88/day, resident
// student $4.90/day, free for accessible-permit and motorbike users, pay/permit
// zones enforced 8am–5pm Mon–Fri and free after 5pm and on weekends.
// Source: https://services.anu.edu.au/campus-environment/transport-parking/parking-fees
//
// THE INTERPRETIVE LAYER, not surveyed: the CATEGORY, RATE and PERMIT of each
// lot are derived from its OSM access/fee/type tags mapped onto the ANU scheme
// above (e.g. access=private → resident/private; access=permit → permit zone;
// public + fee → visitor pay; otherwise the campus staff/student surface
// default). Lot NAMES without an OSM name are labelled by the nearest mapped
// landmark. This is a reasonable reading of open data, not a lot-by-lot check of
// the signage; the README and the app's footnote say so.
//
// To regenerate after refreshing the OSM extracts, see scripts/gen-parking.mjs.

export type Seed = {
  slug: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  hours: string;
  rate: string;
  permit: string;
  fees: string;
  notes?: string;
  capacity?: number;
};

`;

const body =
  "export const CAR_PARKS: Seed[] = [\n" +
  out
    .map((p) => {
      const lines = [
        `    slug: ${JSON.stringify(p.slug)},`,
        `    name: ${JSON.stringify(p.name)},`,
        `    category: ${JSON.stringify(p.category)},`,
        `    lat: ${p.lat},`,
        `    lng: ${p.lng},`,
        `    hours: ${JSON.stringify(p.hours)},`,
        `    rate: ${JSON.stringify(p.rate)},`,
        `    permit: ${JSON.stringify(p.permit)},`,
        `    fees: ${JSON.stringify(p.fees)},`,
        `    notes: ${JSON.stringify(p.notes)},`,
      ];
      if (p.capacity !== undefined) lines.push(`    capacity: ${p.capacity},`);
      return "  {\n" + lines.join("\n") + "\n  },";
    })
    .join("\n") +
  "\n];\n";

fs.writeFileSync(new URL("../src/lib/parking-data.ts", import.meta.url), header + body);
console.error("written parking-data.ts");
