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

function mergeUnique(existing: QueueFile[], incoming: SourceFileInfo[]): QueueFile[] {
  const map = new Map(existing.map((file) => [file.path.toLowerCase(), file]));

  for (const file of incoming) {
    const key = file.path.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        ...file,
        status: 'pending',
        progress: 0,
      });
    }
  }

  return [...map.values()];
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

    setFiles((current) => mergeUnique(current, result.files));
    setSummary(null);

    if (result.ignoredCount > 0) {
      const preview = result.ignoredNames.slice(0, 5).join(', ');
      const remaining = result.ignoredCount - Math.min(result.ignoredNames.length, 5);
      const more = remaining > 0 ? ` e mais ${remaining}` : '';
      setNotice(
        `${result.ignoredCount} item(ns) ignorado(s) (apenas .heic/.heif são aceitos)${
          preview ? `: ${preview}${more}` : ''
        }.`,
      );
    } else {
      setNotice(null);
    }
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
    setFiles([]);
    setSummary(null);
    setNotice(null);
    setErrorMessage(apiReady ? null : API_MISSING_MESSAGE);
  }, [apiReady]);

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
    convert,
    openOutputFolder,
  };
}
