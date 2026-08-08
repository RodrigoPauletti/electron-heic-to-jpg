import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faExclamation, faTimes, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import type { QueueFile } from '../../shared/types';
import { formatBytes, statusLabel } from '../services/format';

interface FileListProps {
  files: QueueFile[];
  canRemove: boolean;
  canAdd: boolean;
  onRemove: (fileId: string) => void;
  onAddFiles: () => void;
  onRequestPreview: (fileId: string) => void;
}

function PreviewThumb({ file }: { file: QueueFile }) {
  if (file.previewStatus === 'ready' && file.previewUrl) {
    return (
      <img
        className="file-thumb"
        src={file.previewUrl}
        alt={`Preview de ${file.name}`}
        draggable={false}
      />
    );
  }

  const label =
    file.previewStatus === 'loading'
      ? 'Carregando…'
      : file.previewStatus === 'error'
        ? 'Sem preview'
        : '';

  return (
    <div
      className={`file-thumb file-thumb-placeholder${
        file.previewStatus === 'loading' ? ' is-loading' : ''
      }${file.previewStatus === 'error' ? ' is-error' : ''}`}
      title={file.previewError}
      aria-hidden
    >
      {label}
    </div>
  );
}

function FileCard({
  file,
  canRemove,
  onRemove,
  onRequestPreview,
}: {
  file: QueueFile;
  canRemove: boolean;
  onRemove: (fileId: string) => void;
  onRequestPreview: (fileId: string) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) {
      return;
    }

    if (file.previewStatus === 'ready' || file.previewStatus === 'loading') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onRequestPreview(file.id);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '160px 0px',
        threshold: 0.01,
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [file.id, file.previewStatus, onRequestPreview]);

  return (
    <article className="file-card" title={file.path} ref={cardRef}>
      <div className="file-card-media">
        <PreviewThumb file={file} />
        {canRemove ? (
          <button
            type="button"
            className="file-remove"
            aria-label={`Excluir ${file.name} da fila`}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(file.id);
            }}
          >
            <FontAwesomeIcon icon={faTrashAlt} />
          </button>
        ) : null}
        {file.status === 'done' ? (
          <div className="file-status-overlay is-done" aria-label="Concluído">
            <span className="file-status-icon" aria-hidden>
              <FontAwesomeIcon icon={faCheck} />
            </span>
          </div>
        ) : file.status === 'error' ? (
          <div className="file-status-overlay is-error" aria-label="Erro">
            <span className="file-status-icon" aria-hidden>
              <FontAwesomeIcon icon={faTimes} />
            </span>
          </div>
        ) : file.status === 'skipped' ? (
          <div className="file-status-overlay is-skipped" aria-label="Ignorado">
            <span className="file-status-icon" aria-hidden>
              <FontAwesomeIcon icon={faExclamation} />
            </span>
          </div>
        ) : (
          null
          // <span className={`status-pill status-${file.status}`}>
          //   {statusLabel(file.status)}
          //   {file.status === 'converting' ? ` ${file.progress}%` : ''}
          // </span>
        )}
        <div className="file-card-caption" title={file.name}>
          {file.name}
        </div>
      </div>
      <div className="file-card-body">
        <div className="file-meta">
          <span>{formatBytes(file.size)}</span>
          {file.outputPath ? <span className="file-meta-label file-meta-label-done">Concluído</span> : null}
          {file.status === 'error' ? <span className="file-meta-label file-meta-label-error">Erro</span> : null}
          {file.status === 'skipped' ? <span className="file-meta-label file-meta-label-skipped">Ignorado</span> : null}
          {file.status === 'converting' ? <span className="file-meta-label file-meta-label-converting">Convertendo</span> : null}
          {file.status === 'pending' ? <span className="file-meta-label file-meta-label-pending">Pendente</span> : null}
        </div>
          {(file.status === 'converting' || file.status === 'done') && (
        <div className={`progress ${file.status === 'converting' || file.status === 'done' ? '' : 'progress-pending'}`} aria-hidden>
            <span style={{ width: `${file.progress}%` }} className={`status-${file.status}`} />
        </div>
          )}
        {file.error ? <div className="file-error">{file.error}</div> : null}
      </div>
    </article>
  );
}

export function FileList({
  files,
  canRemove,
  canAdd,
  onRemove,
  onAddFiles,
  onRequestPreview,
}: FileListProps) {
  return (
    <div className="panel file-list-panel">
      <div className="file-list-header">
        <div className="file-list-title">
          <h3>Arquivos</h3>
          <span className="file-count-badge">
            {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
          </span>
        </div>
        <button type="button" className="btn" onClick={onAddFiles} disabled={!canAdd}>
          Adicionar mais arquivos
        </button>
      </div>
      <div className="file-grid">
        {files.map((file, index) => (
          <FileCard
            key={file.id}
            file={{
              ...file,
              // status: index === 0 ? 'error' : (index === 1 ? 'skipped' : (index === 2 ? 'done' : (index === 2 ? 'converting' : 'pending')))
            }}
            canRemove={canRemove}
            onRemove={onRemove}
            onRequestPreview={onRequestPreview}
          />
        ))}
      </div>
    </div>
  );
}
