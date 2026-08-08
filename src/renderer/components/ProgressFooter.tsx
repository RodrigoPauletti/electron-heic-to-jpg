import type { ConvertBatchSummary } from '../../shared/types';

interface ProgressFooterProps {
  isConverting: boolean;
  total: number;
  done: number;
  failed: number;
  overall: number;
  summary: ConvertBatchSummary | null;
  onOpenFolder: () => void;
  onCancel: () => void;
}

export function ProgressFooter({
  isConverting,
  total,
  done,
  failed,
  overall,
  summary,
  onOpenFolder,
  onCancel,
}: ProgressFooterProps) {
  const showSummary = Boolean(summary) && !isConverting;

  if (!isConverting && !showSummary) {
    return null;
  }

  return (
    <div className="panel footer">
      {isConverting && total > 0 ? (
        <div className="overall">
          <div className="overall-top">
            <span>
              Convertendo… {done} de {total}
            </span>
            <span>{overall}%</span>
          </div>
          <div className="progress" aria-label="Progresso geral">
            <span style={{ width: `${overall}%` }} />
          </div>
          <div className="footer-actions">
            <button type="button" className="btn btn-danger" onClick={onCancel}>
              Cancelar conversão
            </button>
          </div>
        </div>
      ) : null}

      {showSummary && summary ? (
        <div className={`summary${summary.failed > 0 || summary.cancelled ? ' has-errors' : ''}`}>
          <div className="summary-text">
            <strong>
              {summary.converted} arquivo{summary.converted === 1 ? '' : 's'} convertido
              {summary.converted === 1 ? '' : 's'}
              {summary.failed > 0
                ? ` · ${summary.failed} com erro`
                : ''}
              {summary.skipped > 0
                ? ` · ${summary.skipped} ignorado(s)`
                : ''}
            </strong>
            <span>
              {summary.cancelled
                ? 'Conversão interrompida.'
                : failed > 0
                  ? 'Alguns arquivos falharam; os demais foram processados.'
                  : 'Conversão concluída.'}
            </span>
          </div>
          <button type="button" className="btn btn-primary" onClick={onOpenFolder}>
            Abrir pasta
          </button>
        </div>
      ) : null}
    </div>
  );
}
