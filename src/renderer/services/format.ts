export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'] as const;
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function statusLabel(
  status: 'pending' | 'converting' | 'done' | 'error' | 'skipped',
): string {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'converting':
      return 'Convertendo';
    case 'done':
      return 'Concluído';
    case 'error':
      return 'Erro';
    case 'skipped':
      return 'Ignorado';
    default:
      return status;
  }
}
