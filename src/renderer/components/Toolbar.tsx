import { JPEG_QUALITY_OPTIONS, type JpegQuality } from '../../shared/constants';

interface ToolbarProps {
  outputDir: string;
  quality: JpegQuality;
  disabled: boolean;
  canConvert: boolean;
  hasFiles: boolean;
  onQualityChange: (quality: JpegQuality) => void;
  onChooseOutputDir: () => void;
  onAddFiles: () => void;
  onConvert: () => void;
  onClear: () => void;
}

export function Toolbar({
  outputDir,
  quality,
  disabled,
  canConvert,
  hasFiles,
  onQualityChange,
  onChooseOutputDir,
  onAddFiles,
  onConvert,
  onClear,
}: ToolbarProps) {
  return (
    <div className="panel toolbar">
      <div className="field">
        <label htmlFor="output-dir">Pasta de destino</label>
        <div className="field-row">
          <div id="output-dir" className="path-display" title={outputDir}>
            {outputDir || 'Carregando…'}
          </div>
          <button
            type="button"
            className="btn"
            onClick={onChooseOutputDir}
            disabled={disabled}
          >
            Escolher…
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

      <div className="actions">
        <button type="button" className="btn" onClick={onAddFiles} disabled={disabled}>
          Adicionar arquivos
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onConvert}
          disabled={!canConvert || disabled}
        >
          Converter
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClear}
          disabled={!hasFiles || disabled}
        >
          Limpar lista
        </button>
      </div>
    </div>
  );
}
