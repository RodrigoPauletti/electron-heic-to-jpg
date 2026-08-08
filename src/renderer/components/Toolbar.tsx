import { JPEG_QUALITY_OPTIONS, type JpegQuality } from '../../shared/constants';

interface ToolbarProps {
  outputDir: string;
  quality: JpegQuality;
  disabled: boolean;
  onQualityChange: (quality: JpegQuality) => void;
  onChooseOutputDir: () => void;
}

export function Toolbar({
  outputDir,
  quality,
  disabled,
  onQualityChange,
  onChooseOutputDir,
}: ToolbarProps) {
  return (
    <div className="panel toolbar">
      <div className="field">
        <label htmlFor="output-dir">Pasta de destino</label>
        <div className="field-row">
          <button
            type="button"
            id="output-dir"
            className="path-display"
            title={outputDir || undefined}
            onClick={onChooseOutputDir}
            disabled={disabled}
          >
            {outputDir || 'Carregando…'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onChooseOutputDir}
            disabled={disabled}
          >
            Escolher pasta de destino…
          </button>
        </div>
      </div>

      <div className="field" style={{ flex: '0 0 auto', minWidth: 140 }}>
        <label htmlFor="jpeg-quality">Qualidade JPEG</label>
        <select
          id="jpeg-quality"
          className="select"
          value={quality}
          disabled={disabled}
          onChange={(event) => {
            onQualityChange(Number(event.target.value) as JpegQuality);
          }}
        >
          {JPEG_QUALITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}%{option === 95 ? ' (padrão)' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
