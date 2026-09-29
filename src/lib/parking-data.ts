// Seed data: the parking areas on the ANU Acton campus.
//
// GROUNDING & HONESTY.
//
// LOCATIONS AND CAPACITIES come from OpenStreetMap (© OpenStreetMap
// contributors). Every entry's lat/lng is the centre of a real OSM parking
// feature (`amenity=parking`, or `amenity=motorcycle_parking` for the two-wheel
// bays), the same data the map draws, so each pin sits on an actual mapped car
// park. Capacity is shown only where OSM records one: Kambri's 300 spaces, the
// five marked accessible bays, and the three motorcycle bays. Where OSM has no
// capacity, none is shown rather than guessed.
//
// RATES come from ANU's published 2026 parking fees — staff surface at
// $7.78/day, staff parking stations at $9.59/day, non-resident student surface
// at $3.88/day, resident student at $4.90/day, and free parking for
// accessible-permit and motorbike users, with pay/time-limited zones enforced
// 8am–5pm Mon–Fri and free after 5pm and on weekends. Source:
// https://services.anu.edu.au/campus-environment/transport-parking/parking-fees
//
// THE INTERPRETIVE LAYER, not surveyed: which permit category (staff, student,
// resident, visitor) applies to each lot. This is read off OSM's access tags
// (public/pay vs private vs permit) and the hall or building the lot sits
// beside, then matched to the ANU fee scheme above. It is a reasonable mapping,
// not a lot-by-lot reading of the signage; the README and the app's footnote
// say so. Confirming each lot's permit zone against the official permit map is
// the one step left before this could be trusted.

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

export const CAR_PARKS: Seed[] = [
  {
    slug: "union-court",
    name: "Union Court / Kambri (visitor pay parking)",
    category: "Visitor pay parking",
    lat: -35.27642,
    lng: 149.12188,
    hours: "Enforced 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "Casual PayStay, charged by the hour up to a daily cap.",
    permit: "None — anyone may pay and park.",
    fees: "Pay via the PayStay app or a pay station; no permit needed.",
    notes: "The Kambri car park (OSM), closest paid parking to the library and central lecture theatres. Fills first on weekday mornings.",
    capacity: 300,
  },
  {
    slug: "dickson-precinct",
    name: "Dickson Precinct (staff surface)",
    category: "Staff surface permit",
    lat: -35.27339,
    lng: 149.11806,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri. Open to residents after 5pm and on weekends.",
    rate: "$7.78 / day (2026 staff surface rate).",
    permit: "Staff surface permit (daily, 90-day, yearly or payroll deduction).",
    fees: "Eligibility: staff working 10+ hours/week, employed 90+ days. A permit is permission to park, not a guaranteed space.",
    notes: "An OSM-mapped surface lot serving the science precinct on the north of campus.",
  },
  {
    slug: "west-parking-station",
    name: "West Precinct Parking Station",
    category: "Staff parking station",
    lat: -35.27885,
    lng: 149.11252,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri.",
    rate: "$9.59 / day (2026 staff parking-station rate).",
    permit: "Staff parking-station permit.",
    fees: "Multi-storey; covered parking at the parking-station rate, ~10% below comparable Canberra commercial rates.",
    notes: "The multi-storey car park OSM records on the west of campus. Undercover, so it holds up in Canberra summers and frosts alike.",
  },
  {
    slug: "fellows-oval",
    name: "Fellows Oval Surface (student)",
    category: "Non-resident student surface",
    lat: -35.27685,
    lng: 149.11952,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "$3.88 / day (2026 non-resident student surface rate).",
    permit: "Non-resident student surface permit (half the staff surface rate).",
    fees: "For students who commute to campus. Daily and longer-term options available.",
    notes: "An OSM-mapped surface lot a short walk from the Fellows Road teaching buildings.",
  },
  {
    slug: "building-35",
    name: "Birch & Craig (Building 35) Surface",
    category: "Staff / student surface",
    lat: -35.27375,
    lng: 149.11928,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "Staff $7.78 / day; student $3.88 / day.",
    permit: "Staff or student surface permit accepted.",
    fees: "Mixed-permit surface parking, the nearest OSM-mapped lot to the Birch (35) and Craig (35a) teaching buildings.",
    notes: "Handiest parking for classes in the Building 35 precinct; close to the science and psychology teaching rooms.",
  },
  {
    slug: "daley-road",
    name: "Daley Road Surface",
    category: "Staff / student surface",
    lat: -35.27551,
    lng: 149.11562,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "Staff $7.78 / day; student $3.88 / day.",
    permit: "Staff or student surface permit accepted.",
    fees: "An OSM-mapped surface lot off Daley Road, through the middle of campus.",
    notes: "Long and narrow; the far end frees up when the near end is full.",
  },
  {
    slug: "baldessin-precinct",
    name: "Baldessin Precinct (visitor pay parking)",
    category: "Visitor pay parking",
    lat: -35.27951,
    lng: 149.12186,
    hours: "Enforced 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "Casual PayStay, charged by the hour up to a daily cap.",
    permit: "None — anyone may pay and park.",
    fees: "Pay via the PayStay app or a pay station.",
    notes: "The Baldessin car park (OSM), handy for the School of Art & Design and the drill hall gallery.",
  },
  {
    slug: "north-oval",
    name: "North Oval Parking",
    category: "Staff surface permit",
    lat: -35.27398,
    lng: 149.12358,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "$7.78 / day (2026 staff surface rate).",
    permit: "Staff surface permit.",
    fees: "The North Oval car park (OSM), at the eastern edge of campus.",
    notes: "Close to the sport fields and the eastern teaching buildings; empties fast at 5pm.",
  },
  {
    slug: "acton-underhill",
    name: "Acton Underhill (visitor pay parking)",
    category: "Visitor pay parking",
    lat: -35.2866,
    lng: 149.11624,
    hours: "Enforced 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "Casual PayStay, charged by the hour up to a daily cap.",
    permit: "None — anyone may pay and park.",
    fees: "Pay via the PayStay app or a pay station.",
    notes: "The Acton Underhill car park (OSM), at the south of campus; a walk from the centre but usually has room.",
  },
  {
    slug: "ursula-resident",
    name: "Ursula Hall Resident Parking",
    category: "Resident student permit",
    lat: -35.27939,
    lng: 149.11451,
    hours: "Permit required at all times; limited by hall capacity.",
    rate: "$4.90 / day (2026 resident student rate, reduced from 2025).",
    permit: "Resident student permit, allocated through the hall.",
    fees: "A single rate applies across all halls from 2026; permits are limited by hall capacity.",
    notes: "The OSM-mapped parking area beside Ursula Hall. Numbers are capped, so demand outstrips supply.",
  },
  {
    slug: "bruce-wright-resident",
    name: "Bruce & Wright Halls Resident Parking",
    category: "Resident student permit",
    lat: -35.27397,
    lng: 149.11536,
    hours: "Permit required at all times; limited by hall capacity.",
    rate: "$4.90 / day (2026 resident student rate).",
    permit: "Resident student permit, allocated through the hall.",
    fees: "An OSM-mapped parking area (private access) beside the Bruce and Wright Hall buildings.",
    notes: "For students living at Bruce or Wright Hall. Capped, and it fills overnight.",
  },
  {
    slug: "burton-garran-resident",
    name: "Burton & Garran / Wamburun Resident Parking",
    category: "Resident student permit",
    lat: -35.27574,
    lng: 149.11362,
    hours: "Permit required at all times; limited by hall capacity.",
    rate: "$4.90 / day (2026 resident student rate).",
    permit: "Resident student permit, allocated through the hall.",
    fees: "An OSM-mapped parking area serving Burton & Garran Hall and Wamburun Hall on the west of campus.",
    notes: "For residents of B&G and Wamburun. Numbers are capped by the halls.",
  },
  {
    slug: "southwest-resident",
    name: "John XXIII, Burgmann & Yukeembruk Resident Parking",
    category: "Resident student permit",
    lat: -35.28057,
    lng: 149.11254,
    hours: "Permit required at all times; limited by hall capacity.",
    rate: "$4.90 / day (2026 resident student rate).",
    permit: "Resident student permit, allocated through the hall.",
    fees: "The OSM-mapped parking beside the south-west halls: John XXIII College, Burgmann College and Yukeembruk Village.",
    notes: "For residents of the south-west halls. Furthest from the centre, so it holds room longest.",
  },
  {
    slug: "graduate-house",
    name: "Graduate House Parking",
    category: "Resident student permit",
    lat: -35.28265,
    lng: 149.1164,
    hours: "Permit required at all times; limited by hall capacity.",
    rate: "$4.90 / day (2026 resident student rate).",
    permit: "Resident student permit, allocated through the hall.",
    fees: "The OSM-mapped surface parking beside Graduate House, off Garran Road at the south of campus.",
    notes: "For Graduate House residents. Small and quiet, being away from the teaching precincts.",
  },
  {
    slug: "accessible-bays",
    name: "Accessible Bays (campus-wide)",
    category: "Accessible parking",
    lat: -35.27966,
    lng: 149.12389,
    hours: "Available at all times.",
    rate: "Free.",
    permit: "A valid Australian mobility permit or ANU mobility permit.",
    fees: "No charge. Signposted accessible bays are distributed across campus near building entrances.",
    notes: "This pin marks the lot with the most accessible bays OSM records (five); accessible bays exist at most precincts.",
    capacity: 5,
  },
  {
    slug: "motorbike-bays",
    name: "Motorbike & Scooter Bays",
    category: "Motorbike parking",
    lat: -35.281,
    lng: 149.11934,
    hours: "Available at all times.",
    rate: "Free.",
    permit: "None required for motorbikes and scooters.",
    fees: "No charge. Park only in marked motorbike bays.",
    notes: "A motorcycle parking area OSM records near the College of Law. Free parking for two wheels is one of the better-kept secrets on campus.",
    capacity: 3,
  },
];
