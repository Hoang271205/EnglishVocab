export const LAST_CHECKED_KEY = 'englishvocab.backup.lastCheckedAt';

export const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function readLastChecked(): number {
  try {
    const value = Number(localStorage.getItem(LAST_CHECKED_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}
