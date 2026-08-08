import type { QueueFile } from '../../shared/types';
import { formatBytes, statusLabel } from '../services/format';

interface FileListProps {
  files: QueueFile[];
}

export function FileList({ files }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="panel file-list-panel">
        <div className="file-list-header">
          <h3>Arquivos</h3>
          <span>Nenhum arquivo na fila</span>
        </div>
        <div className="empty-list">Adicione imagens HEIC/HEIF para começar.</div>
      </div>
    );
  }

  return (
    <div className="panel file-list-panel">
      <div className="file-list-header">
        <h3>Arquivos</h3>
        <span>
          {files.length} item{files.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="file-list">
        {files.map((file) => (
          <div className="file-row" key={file.id}>
            <div className="file-main">
              <div className="file-name" title={file.path}>
                {file.name}
              </div>
              <div className="file-meta">
                <span>{formatBytes(file.size)}</span>
                {file.outputPath ? <span title={file.outputPath}>Salvo</span> : null}
              </div>
              {(file.status === 'converting' || file.status === 'done') && (
                <div className="progress" aria-hidden>
                  <span style={{ width: `${file.progress}%` }} />
                </div>
              )}
              {file.error ? <div className="file-error">{file.error}</div> : null}
            </div>
            <span className={`status-pill status-${file.status}`}>
              {statusLabel(file.status)}
              {file.status === 'converting' ? ` ${file.progress}%` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
