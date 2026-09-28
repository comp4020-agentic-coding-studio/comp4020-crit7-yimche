// Seed data: the parking areas on the ANU Acton campus.
//
// GROUNDING & HONESTY. The rate scheme below follows ANU's published 2026
// parking fees — staff surface permits at $7.78/day, staff parking stations at
// $9.59/day, non-resident student surface at $3.88/day, resident student at
// $4.90/day, and free parking for accessible-permit and motorbike users, with
// pay/time-limited zones enforced 8am–5pm Mon–Fri and free after 5pm and on
// weekends. Source: https://services.anu.edu.au/campus-environment/transport-parking/parking-fees
//
// The individual car-park NAMES, CAPACITIES and MAP COORDINATES are
// illustrative placeholders chosen to demonstrate the app, not surveyed
// ground truth. This is a prototype; before this could be trusted, each entry
// would need checking against the official signage and permit zone map. The
// README says the same, in plainer words.

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
    lat: -35.277,
    lng: 149.1185,
    hours: "Enforced 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "Casual PayStay, charged by the hour up to a daily cap.",
    permit: "None — anyone may pay and park.",
    fees: "Pay via the PayStay app or a pay station; no permit needed.",
    notes: "Closest paid parking to Kambri, the library and central lecture theatres. Fills first on weekday mornings.",
    capacity: 120,
  },
  {
    slug: "dickson-precinct",
    name: "Dickson Precinct (staff surface)",
    category: "Staff surface permit",
    lat: -35.2748,
    lng: 149.1202,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri. Open to residents after 5pm and on weekends.",
    rate: "$7.78 / day (2026 staff surface rate).",
    permit: "Staff surface permit (daily, 90-day, yearly or payroll deduction).",
    fees: "Eligibility: staff working 10+ hours/week, employed 90+ days. A permit is permission to park, not a guaranteed space.",
    notes: "Surface parking serving the science precinct.",
    capacity: 90,
  },
  {
    slug: "west-parking-station",
    name: "West Precinct Parking Station",
    category: "Staff parking station",
    lat: -35.2782,
    lng: 149.1156,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri.",
    rate: "$9.59 / day (2026 staff parking-station rate).",
    permit: "Staff parking-station permit.",
    fees: "Multi-storey; covered parking at the parking-station rate, ~10% below comparable Canberra commercial rates.",
    notes: "Undercover, so it holds up in Canberra summers and frosts alike.",
    capacity: 240,
  },
  {
    slug: "fellows-oval",
    name: "Fellows Oval Surface (student)",
    category: "Non-resident student surface",
    lat: -35.2769,
    lng: 149.1224,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "$3.88 / day (2026 non-resident student surface rate).",
    permit: "Non-resident student surface permit (half the staff surface rate).",
    fees: "For students who commute to campus. Daily and longer-term options available.",
    notes: "A short walk to the Fellows Road teaching buildings.",
    capacity: 110,
  },
  {
    slug: "daley-road",
    name: "Daley Road Surface",
    category: "Staff / student surface",
    lat: -35.2761,
    lng: 149.1173,
    hours: "Permit hours 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "Staff $7.78 / day; student $3.88 / day.",
    permit: "Staff or student surface permit accepted.",
    fees: "Mixed-permit surface zone spanning the middle of campus.",
    notes: "Long and narrow; the far end frees up when the near end is full.",
    capacity: 160,
  },
  {
    slug: "baldessin-precinct",
    name: "Baldessin Precinct (visitor pay parking)",
    category: "Visitor pay parking",
    lat: -35.2795,
    lng: 149.1201,
    hours: "Enforced 8:00am–5:00pm Mon–Fri. Free after 5pm and on weekends.",
    rate: "Casual PayStay, charged by the hour up to a daily cap.",
    permit: "None — anyone may pay and park.",
    fees: "Pay via the PayStay app or a pay station.",
    notes: "Handy for the School of Art & Design and the drill hall gallery.",
    capacity: 80,
  },
  {
    slug: "ursula-resident",
    name: "Ursula Hall Resident Parking",
    category: "Resident student permit",
    lat: -35.2748,
    lng: 149.1231,
    hours: "Permit required at all times; limited by hall capacity.",
    rate: "$4.90 / day (2026 resident student rate, reduced from 2025).",
    permit: "Resident student permit, allocated through the hall.",
    fees: "A single rate applies across all halls from 2026; permits are limited by hall capacity.",
    notes: "For students living on campus. Numbers are capped, so demand outstrips supply.",
    capacity: 40,
  },
  {
    slug: "accessible-bays",
    name: "Accessible Bays (campus-wide)",
    category: "Accessible parking",
    lat: -35.2773,
    lng: 149.1198,
    hours: "Available at all times.",
    rate: "Free.",
    permit: "A valid Australian mobility permit or ANU mobility permit.",
    fees: "No charge. Signposted accessible bays are distributed across campus near building entrances.",
    notes: "This pin marks a representative cluster; accessible bays exist at most precincts.",
    capacity: 30,
  },
  {
    slug: "motorbike-bays",
    name: "Motorbike & Scooter Bays",
    category: "Motorbike parking",
    lat: -35.2785,
    lng: 149.1216,
    hours: "Available at all times.",
    rate: "Free.",
    permit: "None required for motorbikes and scooters.",
    fees: "No charge. Park only in marked motorbike bays.",
    notes: "Free parking for two wheels is one of the better-kept secrets on campus.",
    capacity: 25,
  },
];
