// Time formatting for the app. Everything is stored in UTC (SQLite's
// datetime('now') returns UTC, kept as "YYYY-MM-DD HH:MM:SS" with no zone
// marker), but this is an ANU campus app, so times are shown to a driver in
// Canberra time. Intl handles the AEST/AEDT switch across daylight saving, so
// the label is always the right one for the date.
const CANBERRA_TZ = "Australia/Canberra";

const canberraFormat = new Intl.DateTimeFormat("en-AU", {
  timeZone: CANBERRA_TZ,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
});

// Render a stored UTC timestamp in Canberra time, e.g.
// "29 Sept 2026, 2:30 pm AEST". A value we can't parse is returned untouched
// rather than shown as a wrong or fake time.
export function formatCanberra(sqlUtc: string): string {
  const instant = new Date(`${sqlUtc.replace(" ", "T")}Z`);
  if (Number.isNaN(instant.getTime())) return sqlUtc;
  return canberraFormat.format(instant);
}
