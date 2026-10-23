export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}

export function errorMessage(
  cause: unknown,
  fallback = 'Không thực hiện được thao tác.',
): string {
  return cause instanceof Error ? cause.message : fallback;
}
