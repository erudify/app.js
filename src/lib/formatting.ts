export function formatDuration(seconds: number): string {
  const months = Math.floor(seconds / (30 * 24 * 60 * 60));
  seconds %= 30 * 24 * 60 * 60;
  const weeks = Math.floor(seconds / (7 * 24 * 60 * 60));
  seconds %= 7 * 24 * 60 * 60;
  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= 24 * 60 * 60;
  const hours = Math.floor(seconds / (60 * 60));
  seconds %= 60 * 60;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (months > 0) parts.push(`${months}m`);
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds}sec`);

  return parts.slice(0, 2).join(" ") || "0sec";
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatMinutes(seconds: number): string {
  if (seconds < 60) {
    return "less than a minute";
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

/** Format a number concisely with 3 significant digits, using scientific notation when appropriate. */
export function formatCompactNumber(value: number): string {
  return value.toPrecision(3).replace("e+", "e");
}

/** Format a duration in shorthand without spaces, e.g. "3w3d", "2h15min". */
export function formatShortDuration(seconds: number): string {
  const weeks = Math.floor(seconds / (7 * 24 * 60 * 60));
  seconds %= 7 * 24 * 60 * 60;
  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= 24 * 60 * 60;
  const hours = Math.floor(seconds / (60 * 60));
  seconds %= 60 * 60;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds}sec`);

  return parts.slice(0, 2).join("") || "0sec";
}

/** Format a relative time from now, e.g. "in 3w3d" or "3h ago". */
export function formatRelativeTime(targetTimestamp: number, now: number): string {
  const diffMs = targetTimestamp - now;
  const diffSeconds = Math.abs(diffMs) / 1000;
  const formatted = formatShortDuration(diffSeconds);
  if (diffMs < 0) return `${formatted} ago`;
  return `in ${formatted}`;
}

export function normalizePinyin(pinyin: string): string {
  return pinyin.toLowerCase().replace(/\s+/g, "");
}
