interface ActionBarProps {
  disabled: boolean;
  canConvert: boolean;
  canClear: boolean;
  isConverting: boolean;
  fileCount: number;
  onConvert: () => void;
  onClear: () => void;
}

export function ActionBar({
  disabled,
  canConvert,
  canClear,
  isConverting,
  fileCount,
  onConvert,
  onClear,
}: ActionBarProps) {
  const convertLabel =
    isConverting
      ? 'Convertendo…'
      : fileCount > 0
        ? `Converter (${fileCount})`
        : 'Converter';

  return (
    <div className="panel action-bar">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onClear}
        disabled={disabled || !canClear}
      >
        Limpar lista
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onConvert}
        disabled={disabled || !canConvert}
      >
        {convertLabel}
      </button>
    </div>
  );
}
