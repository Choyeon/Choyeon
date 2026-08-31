/**
 * Shared format helpers.  Single source of truth for duration/number
 * formatting so the same math does not need to be copied across screens.
 */

/**
 * Human-readable duration for Chinese history cards: "X分Y秒" / "X小时Y分".
 */
export function formatDurationHuman(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    if (mins > 0) return `${hrs}小时${mins}分`;
    return `${hrs}小时`;
  }
  if (mins > 0) {
    if (secs > 0) return `${mins}分${secs}秒`;
    return `${mins}分`;
  }
  return `${secs}秒`;
}

/**
 * Clock-style duration MM:SS or H:MM:SS for the in-progress workout timer.
 */
export function formatDurationClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Compact large numbers (volumes / counts) into "1.2k" / "12.5k" style with
 * kilo separators for exact counts under 10k.
 */
export function formatCompactCount(n: number): string {
  const v = Number(n) || 0;
  if (v < 1000) return v.toLocaleString();
  if (v < 10000) return (v / 1000).toFixed(v < 10000 && v % 1000 !== 0 ? 1 : 0) + 'k';
  return (v / 1000).toFixed(1) + 'k';
}
