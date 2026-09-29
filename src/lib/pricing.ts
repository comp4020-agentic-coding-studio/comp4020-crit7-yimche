// What a parking session costs, grounded in ANU's published 2026 parking fees:
// https://services.anu.edu.au/campus-environment/transport-parking/parking-fees
//
// The bookable ticket is a PAY-AS-YOU-GO session (ANU's "PayStay"), which is
// the parking a driver buys on the spot and which needs NO permit. Every figure
// below is quoted from that page, not invented:
//   PayStay staff/student: $2.36/hour or $16.92 all day.
//   PayStay visitor:       $3.07/hour or $27.63 all day.
// Permit holders park under their permit instead of paying per session, and
// some parking is free (accessible bays, motorbikes in marked spaces, honorary
// staff). Those are shown on the booking page for reference but are not sold
// here, so the app never charges for parking that is free or permit-covered.

export type RateClass = {
  id: string;
  label: string;
  hourlyCents: number;
  allDayCents: number;
};

// The PayStay rate classes, the only thing this app actually charges for.
export const RATE_CLASSES: RateClass[] = [
  {
    id: "staff-student",
    label: "Staff or student",
    hourlyCents: 236,
    allDayCents: 1692,
  },
  { id: "visitor", label: "Visitor", hourlyCents: 307, allDayCents: 2763 },
];

// Shown, not sold: the 2026 permit day-rates and the free categories, so a
// booker can see whether a permit or a free bay suits them better than paying
// per session. A permit is arranged through ANU, never through this prototype.
export const PERMIT_REFERENCE: { label: string; detail: string }[] = [
  { label: "Staff surface permit", detail: "$7.78/day" },
  { label: "Staff parking station", detail: "$9.59/day" },
  { label: "Student permit (non-resident surface)", detail: "$3.88/day" },
  { label: "Student permit (parking station)", detail: "$7.19/day" },
  { label: "Resident permit (parking station)", detail: "$4.90/day" },
  { label: "Accessible bays, motorbikes, honorary staff", detail: "Free" },
];

// The enforced window is roughly 8am to 5pm on weekdays, so a paid session runs
// at most that many hours and an all-day ticket is priced and dated to match.
export const MAX_HOURS = 9;

export const MODES = ["hourly", "all-day"] as const;
export type Mode = (typeof MODES)[number];

export function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

export function rateClass(id: string): RateClass | undefined {
  return RATE_CLASSES.find((r) => r.id === id);
}

// The charge for a session: the all-day price flat, or the hourly price times
// the hours booked. One place decides it so the quote and the stored ticket
// agree.
export function priceCents(cls: RateClass, mode: Mode, hours: number): number {
  return mode === "all-day" ? cls.allDayCents : cls.hourlyCents * hours;
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
