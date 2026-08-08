import type { ConvertBatchSummary } from '../../shared/types';

interface ProgressFooterProps {
  isConverting: boolean;
  total: number;
  done: number;
  failed: number;
  overall: number;
  summary: ConvertBatchSummary | null;
  onOpenFolder: () => void;
}

export function ProgressFooter({
  isConverting,
  total,
  done,
  failed,
  overall,
  summary,
  onOpenFolder,
}: ProgressFooterProps) {
  const showSummary = Boolean(summary) && !isConverting;

  return (
    <div className="panel footer">
      {(isConverting || total > 0) && (
        <div className="overall">
          <div className="overall-top">
            <span>
              {isConverting
                ? `Convertendo… ${done} de ${total}`
                : `Progresso geral — ${done}/${total} concluído(s)`}
            </span>
            <span>{overall}%</span>
          </div>
          <div className="progress" aria-label="Progresso geral">
            <span style={{ width: `${overall}%` }} />
          </div>
        </div>
      )}

      {showSummary && summary ? (
        <div className={`summary${summary.failed > 0 ? ' has-errors' : ''}`}>
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
