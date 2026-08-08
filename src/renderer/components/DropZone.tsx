import { useCallback, useState, type DragEvent, type KeyboardEvent } from 'react';

interface DropZoneProps {
  disabled?: boolean;
  onPaths: (paths: string[]) => void;
  onBrowse: () => void;
}

export function DropZone({ disabled, onPaths, onBrowse }: DropZoneProps) {
  const [active, setActive] = useState(false);

  const extractPaths = useCallback((dataTransfer: DataTransfer): string[] => {
    const paths: string[] = [];

    if (dataTransfer.files.length > 0) {
      for (const file of Array.from(dataTransfer.files)) {
        try {
          const filePath = window.heicConverter.getPathForFile(file);
          if (filePath) {
            paths.push(filePath);
          }
        } catch {
          // Arquivo sem caminho local — ignora
        }
      }
    }

    return [...new Set(paths)];
  }, []);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setActive(false);

    if (disabled) {
      return;
    }

    const paths = extractPaths(event.dataTransfer);
    if (paths.length > 0) {
      onPaths(paths);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onBrowse();
    }
  };

  return (
    <div
      className={`panel dropzone${active ? ' active' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onBrowse();
        }
      }}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div>
        <h2>Arraste seus arquivos HEIC aqui</h2>
        <p>ou clique para selecionar</p>
        <p className="hint">Aceita .heic / .heif — arquivos individuais ou pastas</p>
      </div>
    </div>
  );
}
