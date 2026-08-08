import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_META, type JpegQuality } from '../../shared/constants';
import type { HeicConverterApi } from '../../shared/api';
import type {
  ConvertBatchSummary,
  QueueFile,
  SourceFileInfo,
} from '../../shared/types';

const API_MISSING_MESSAGE =
  'API do aplicativo indisponível. Reinicie o HEIC Converter. Se o problema continuar, o preload falhou ao carregar.';

function getApi(): HeicConverterApi | null {
  return window.heicConverter ?? null;
}

function mergeUnique(
  existing: QueueFile[],
  incoming: SourceFileInfo[],
): { files: QueueFile[]; duplicates: SourceFileInfo[] } {
  const map = new Map(existing.map((file) => [file.path.toLowerCase(), file]));
  const duplicates: SourceFileInfo[] = [];

  for (const file of incoming) {
    const key = file.path.toLowerCase();
    if (map.has(key)) {
      duplicates.push(file);
      continue;
    }

    map.set(key, {
      ...file,
      status: 'pending',
      progress: 0,
      previewStatus: 'idle',
    });
  }

  return { files: [...map.values()], duplicates };
}

function buildNoticeParts(parts: string[]): string | null {
  if (parts.length === 0) {
    return null;
  }
  return parts.join(' ');
}

export function useConverter() {
  const [files, setFiles] = useState<QueueFile[]>([]);
  const [outputDir, setOutputDir] = useState('');
  const [quality, setQuality] = useState<JpegQuality>(APP_META.defaultJpegQuality);
  const [isConverting, setIsConverting] = useState(false);
  const [summary, setSummary] = useState<ConvertBatchSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(() => Boolean(getApi()));
  const convertingRef = useRef(false);
  const previewRequestedRef = useRef(new Set<string>());
  const filesRef = useRef<QueueFile[]>([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const requestPreview = useCallback((fileId: string) => {
    const api = getApi();
    if (!api) {
      return;
    }

    if (previewRequestedRef.current.has(fileId)) {
      return;
    }

    const target = filesRef.current.find((file) => file.id === fileId);
    if (!target || target.previewStatus === 'ready' || target.previewStatus === 'loading') {
      return;
    }

    previewRequestedRef.current.add(fileId);

    setFiles((current) =>
      current.map((item) =>
        item.id === fileId ? { ...item, previewStatus: 'loading', previewError: undefined } : item,
      ),
    );

    void (async () => {
      try {
        const result = await api.getPreview(target.path);
        setFiles((current) =>
          current.map((item) => {
            if (item.id !== fileId) {
              return item;
            }
            if (result.dataUrl) {
              return {
                ...item,
                previewUrl: result.dataUrl,
                previewStatus: 'ready',
                previewError: undefined,
              };
            }
            return {
              ...item,
              previewStatus: 'error',
              previewError: result.error ?? 'Falha ao gerar preview.',
            };
          }),
        );
      } catch {
        setFiles((current) =>
          current.map((item) =>
            item.id === fileId
              ? {
                  ...item,
                  previewStatus: 'error',
                  previewError: 'Falha ao gerar preview.',
                }
              : item,
          ),
        );
      }
    })();
  }, []);

  useEffect(() => {
    const api = getApi();
    if (!api) {
      setApiReady(false);
      setErrorMessage(API_MISSING_MESSAGE);
      return;
    }

    setApiReady(true);
    let active = true;

    void api.getDefaultOutputDir().then((dir) => {
      if (active) {
        setOutputDir(dir);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const api = getApi();
    if (!api) {
      return;
    }

    const offProgress = api.onConvertProgress((event) => {
      setFiles((current) =>
        current.map((file) =>
          file.id === event.fileId
            ? { ...file, status: 'converting', progress: event.progress }
            : file,
        ),
      );
    });

    const offDone = api.onConvertFileDone((result) => {
      setFiles((current) =>
        current.map((file) =>
          file.id === result.fileId
            ? {
                ...file,
                status: result.status,
                progress: result.status === 'done' ? 100 : file.progress,
                error: result.error,
                outputPath: result.outputPath,
              }
            : file,
        ),
      );
    });

    return () => {
      offProgress();
      offDone();
    };
  }, []);

  const stats = useMemo(() => {
    const total = files.length;
    const done = files.filter((f) => f.status === 'done').length;
    const failed = files.filter((f) => f.status === 'error').length;
    const converting = files.filter((f) => f.status === 'converting').length;
    const pending = files.filter((f) => f.status === 'pending').length;
    const overall =
      total === 0
        ? 0
        : Math.round(
            files.reduce((acc, file) => acc + (file.status === 'done' ? 100 : file.progress), 0) /
              total,
          );

    return { total, done, failed, converting, pending, overall };
  }, [files]);

  const addFromPaths = useCallback(async (paths: string[]) => {
    const api = getApi();
    if (!api) {
      setErrorMessage(API_MISSING_MESSAGE);
      return;
    }

    if (paths.length === 0) {
      return;
    }

    setErrorMessage(null);
    const result = await api.resolvePaths(paths);

    const existingPaths = new Set(
      filesRef.current.map((file) => file.path.toLowerCase()),
    );
    const duplicates = result.files.filter((file) =>
      existingPaths.has(file.path.toLowerCase()),
    );

    setFiles((current) => mergeUnique(current, result.files).files);
    setSummary(null);

    const notices: string[] = [];

    if (duplicates.length > 0) {
      const previewNames = duplicates
        .slice(0, 5)
        .map((file) => file.name)
        .join(', ');
      const remaining = duplicates.length - Math.min(duplicates.length, 5);
      const more = remaining > 0 ? ` e mais ${remaining}` : '';
      if (duplicates.length === 1) {
        notices.push(
          `1 arquivo selecionado já estava na lista e foi ignorado${
            previewNames ? `: ${previewNames}${more}` : ''
          }.`,
        );
      } else {
        notices.push(
          `${duplicates.length} arquivos selecionados já estavam na lista e foram ignorados${
            previewNames ? `: ${previewNames}${more}` : ''
          }.`,
        );
      }
    }

    if (result.ignoredCount > 0) {
      const previewNames = result.ignoredNames.slice(0, 5).join(', ');
      const remaining = result.ignoredCount - Math.min(result.ignoredNames.length, 5);
      const more = remaining > 0 ? ` e mais ${remaining}` : '';
      if (result.ignoredCount === 1) {
        notices.push(
          `1 arquivo selecionado foi ignorado (apenas .heic/.heif são aceitos)${
            previewNames ? `: ${previewNames}${more}` : ''
          }.`,
        );
      } else {
        notices.push(
          `${result.ignoredCount} arquivos selecionados foram ignorados (apenas .heic/.heif são aceitos)${
            previewNames ? `: ${previewNames}${more}` : ''
          }.`,
        );
      }
    }

    setNotice(buildNoticeParts(notices));
  }, []);

  const addFilesViaDialog = useCallback(async () => {
    const api = getApi();
    if (!api) {
      setErrorMessage(API_MISSING_MESSAGE);
      return;
    }

    if (convertingRef.current) {
      return;
    }

    const result = await api.selectFiles();
    if (!result.canceled) {
      await addFromPaths(result.filePaths);
    }
  }, [addFromPaths]);

  const chooseOutputDir = useCallback(async () => {
    const api = getApi();
    if (!api) {
      setErrorMessage(API_MISSING_MESSAGE);
      return;
    }

    if (convertingRef.current) {
      return;
    }

    const result = await api.selectOutputDir(outputDir || undefined);
    if (!result.canceled && result.path) {
      setOutputDir(result.path);
      setSummary(null);
    }
  }, [outputDir]);

  const clearList = useCallback(() => {
    if (convertingRef.current) {
      return;
    }

    previewRequestedRef.current.clear();
    setFiles([]);
    setSummary(null);
    setNotice(null);
    setErrorMessage(apiReady ? null : API_MISSING_MESSAGE);

    const api = getApi();
    if (api) {
      void api.clearPreviewCache();
    }
  }, [apiReady]);

  const removeFile = useCallback((fileId: string) => {
    if (convertingRef.current) {
      return;
    }

    previewRequestedRef.current.delete(fileId);
    setFiles((current) => current.filter((file) => file.id !== fileId));
  }, []);

  const convert = useCallback(async () => {
    const api = getApi();
    if (!api) {
      setErrorMessage(API_MISSING_MESSAGE);
      return;
    }

    if (convertingRef.current || files.length === 0 || !outputDir) {
      return;
    }

    convertingRef.current = true;
    setIsConverting(true);
    setSummary(null);
    setErrorMessage(null);
    setNotice(null);

    setFiles((current) =>
      current.map((file) => ({
        ...file,
        status: 'pending',
        progress: 0,
        error: undefined,
        outputPath: undefined,
      })),
    );

    try {
      const result = await api.convertBatch({
        files: files.map(({ id, path, name, size }) => ({ id, path, name, size })),
        outputDir,
        quality,
      });
      setSummary(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha na conversão.';
      setErrorMessage(message);
    } finally {
      convertingRef.current = false;
      setIsConverting(false);
    }
  }, [files, outputDir, quality]);

  const cancelConversion = useCallback(async () => {
    const api = getApi();
    if (!api || !convertingRef.current) {
      return;
    }
    await api.cancelConversion();
  }, []);

  const openOutputFolder = useCallback(async () => {
    const api = getApi();
    if (!api) {
      setErrorMessage(API_MISSING_MESSAGE);
      return;
    }

    const target = summary?.outputDir || outputDir;
    if (!target) {
      return;
    }
    const openError = await api.openPath(target);
    if (openError) {
      setErrorMessage(`Não foi possível abrir a pasta: ${openError}`);
    }
  }, [outputDir, summary]);

  return {
    files,
    outputDir,
    quality,
    setQuality,
    isConverting,
    summary,
    notice,
    errorMessage,
    apiReady,
    stats,
    addFromPaths,
    addFilesViaDialog,
    chooseOutputDir,
    clearList,
    removeFile,
    requestPreview,
    convert,
    cancelConversion,
    openOutputFolder,
  };
}
