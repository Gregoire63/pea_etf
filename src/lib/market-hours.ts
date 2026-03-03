/**
 * Checks whether the Euronext Paris market is currently open.
 * Trading hours: Monday–Friday, 9:00–17:30 CET/CEST.
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const paris = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Paris" }),
  );
  const day = paris.getDay();
  if (day === 0 || day === 6) return false;
  const h = paris.getHours();
  const m = paris.getMinutes();
  const time = h * 60 + m;
  return time >= 540 && time <= 1050; // 9:00 → 17:30
}
