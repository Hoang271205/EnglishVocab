export function downloadJson(
  value: unknown,
  fileName: string,
): void {
  const blob = new Blob(
    [JSON.stringify(value, null, 2)],
    { type: 'application/json;charset=utf-8' },
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.append(link);

  try {
    link.click();
  } finally {
    link.remove();

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      60_000,
    );
  }
}