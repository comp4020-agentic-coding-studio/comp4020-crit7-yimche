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

// The Acton campus boundary, as a closed ring of [lng, lat] vertices. The three
// sides a driver would recognise are traced along the real OpenStreetMap
// centrelines of the roads that bound the campus (© OpenStreetMap contributors,
// extract in ./osm/boundary-roads.json, query in ./osm/boundary-roads.overpassql):
// Clunies Ross Street on the west (way 4580944 and its continuations), Barry
// Drive on the north (from the Clunies Ross corner east, way 262535338 et al.),
// and Edinburgh Avenue on the south-east (way 183079037 et al.). The south side,
// which no single road closes, follows the lake edge below every mapped campus
// lot. Anything the OSM bounding box caught beyond these roads (CSIRO Black
// Mountain and the Botanic Gardens west of Clunies Ross, North Oval and Toad
// Hall north of Barry Drive, New Acton south-east of Edinburgh Avenue) is not on
// the campus this app is for, so it is clipped out below.
const CAMPUS_BOUNDARY = [
  [149.11737, -35.27227], [149.11645, -35.27338], [149.11572, -35.27421], [149.11496, -35.27506],
  [149.1143, -35.2758], [149.11334, -35.27688], [149.11277, -35.27756], [149.11179, -35.27865],
  [149.11108, -35.27943], [149.11062, -35.27994], [149.11011, -35.28052], [149.10907, -35.2817],
  [149.10781, -35.283], [149.10736, -35.28357],
  [149.106, -35.2905], [149.12189, -35.2905],
  [149.12189, -35.28589], [149.12309, -35.28426], [149.12411, -35.28375], [149.12526, -35.28332],
  [149.12686, -35.28279], [149.12757, -35.28262],
  [149.12692, -35.27552], [149.12587, -35.27529], [149.12367, -35.27455], [149.12273, -35.27397],
  [149.12204, -35.2734], [149.12126, -35.27323], [149.12006, -35.27289], [149.11926, -35.2728],
];

// Standard ray-casting point-in-polygon. A lot whose centre falls outside the
// ring is past one of the boundary roads, so it is dropped from the directory.
function onCampus(lat, lng) {
  let inside = false;
  for (let i = 0, j = CAMPUS_BOUNDARY.length - 1; i < CAMPUS_BOUNDARY.length; j = i++) {
    const [xi, yi] = CAMPUS_BOUNDARY[i], [xj, yj] = CAMPUS_BOUNDARY[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
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
  enforced: "Permit and PayStay enforced 8am–5pm Mon–Fri, public holidays excepted; no pay or permit needed outside those hours. Signed bay limits (reserved, disability, loading, time-limited) still apply 24/7.",
  always: "Open at all times; no pay or permit required. Any signed bay restrictions still apply.",
  private: "Private or reserved access; a permit is required, enforced 24 hours a day.",
  customer: "While attending the adjacent facility.",
};

function classify(t) {
  const fee = t.fee;
  const type = t.parking;
  const access = t.access;
  if (t.amenity === "motorcycle_parking")
    return { category: "Motorbike parking", rate: RATES.motorbike, permit: "Free in designated motorcycle bays; a motorcycle permit is needed in parking stations.", hours: HOURS.always };
  if (access === "private")
    return { category: "Resident / private", rate: RATES.private, permit: "Residential ePermit, or private/reserved authorisation.", hours: HOURS.private };
  if (access === "customers")
    return { category: "Customer parking", rate: RATES.customer, permit: "Customers of the adjacent facility.", hours: HOURS.customer };
  if (access === "permit")
    return { category: "Permit parking", rate: RATES.permit, permit: "A valid ANU ePermit for this zone, or casual PayStay where signed.", hours: HOURS.enforced };
  // access yes / permissive / unmarked
  if (fee === "yes") {
    if (type === "multi-storey" || type === "underground")
      return { category: "Staff parking station", rate: RATES.station, permit: "Staff parking-station permit, or casual PayStay where signed.", hours: HOURS.enforced };
    return { category: "Visitor pay parking", rate: RATES.visitor, permit: "No permit needed; pay-as-you-go via PayStay.", hours: HOURS.enforced };
  }
  if (fee === "no")
    return { category: "Free parking", rate: RATES.free, permit: "None.", hours: HOURS.always };
  // unmarked: default to the campus staff/student surface interpretation
  return { category: "Staff / student surface", rate: RATES.surface, permit: "Staff surface ePermit or (non-resident) student surface permit, or casual PayStay.", hours: HOURS.enforced };
}

function slugify(s) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

// Clip to the campus: drop any lot whose centre sits past the boundary roads.
const onCampusParks = kept.filter((e) => onCampus(e.c.lat, e.c.lon));
console.error("clipped off-campus lots:", kept.length - onCampusParks.length, "of", kept.length);

const seen = new Map();
const out = [];
for (const e of onCampusParks) {
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
// CLIPPED TO THE CAMPUS. The set is bounded by the roads that ring Acton:
// Clunies Ross Street (west), Barry Drive (north) and Edinburgh Avenue
// (south-east). Lots the OSM extract caught across those roads (CSIRO Black
// Mountain and the Botanic Gardens, North Oval and Toad Hall, New Acton) are
// not on this campus and are left out. The boundary is traced from the roads'
// own OSM geometry; see the CAMPUS_BOUNDARY note in scripts/gen-parking.mjs.
//
// RATES are ANU's published 2026 parking fees — staff surface $7.78/day,
// staff parking stations $9.59/day, non-resident student $3.88/day, resident
// student $4.90/day, free for accessible-permit and motorbike users. Pay and
// permit zones are enforced 8am–5pm Mon–Fri, public holidays excepted, with no
// pay or permit required outside those hours; signed bay limits still apply
// 24/7. The enforcement hours and the permit-type names come from ANU's
// parking-options guidance, the rates from the parking-fees page.
//   https://services.anu.edu.au/campus-environment/transport-parking/parking-fees
//   https://services.anu.edu.au/campus-environment/transport-parking/parking-options-on-acton-campus
//
// THE INTERPRETIVE LAYER, not surveyed: the CATEGORY, RATE and PERMIT of each
// lot are derived from its OSM access/fee/type tags mapped onto the ANU scheme
// above (e.g. access=private → resident/private; access=permit → permit zone;
// public + fee → visitor pay; otherwise the campus staff/student surface
// default). The permit-type NAMES are ANU's own, but which type applies to a
// given lot is inferred from OSM, not read off that lot's signage. Lot NAMES
// without an OSM name are labelled by the nearest mapped
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
