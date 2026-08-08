import { BrowserWindow, dialog, ipcMain, shell, app } from 'electron';
import { APP_META, IPC_CHANNELS, JPEG_QUALITY_OPTIONS } from '../../shared/constants';
import type {
  ConvertBatchRequest,
  ConvertBatchSummary,
  ConvertFileResult,
  ConvertProgressEvent,
} from '../../shared/types';
import { getDefaultConvertedDir, resolveHeicPaths } from '../services/file-system';
import { convertBatch } from '../services/image-converter';
import { assertSafeAbsolutePath } from '../services/path-utils';

let conversionSignal: { cancelled: boolean } | null = null;

function getMainWindow(): BrowserWindow | null {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused) {
    return focused;
  }
  const all = BrowserWindow.getAllWindows();
  return all[0] ?? null;
}

function sendToRenderer(channel: string, payload: unknown): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

async function showOpenDialog(
  options: Electron.OpenDialogOptions,
): Promise<Electron.OpenDialogReturnValue> {
  const win = getMainWindow();
  if (win) {
    return dialog.showOpenDialog(win, options);
  }
  return dialog.showOpenDialog(options);
}

function isValidQuality(value: unknown): value is ConvertBatchRequest['quality'] {
  return (
    typeof value === 'number' &&
    JPEG_QUALITY_OPTIONS.includes(value as ConvertBatchRequest['quality'])
  );
}

function validateConvertRequest(payload: unknown): ConvertBatchRequest {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Requisição de conversão inválida.');
  }

  const data = payload as Partial<ConvertBatchRequest>;

  if (!Array.isArray(data.files) || data.files.length === 0) {
    throw new Error('Nenhum arquivo para converter.');
  }

  if (data.files.length > 2000) {
    throw new Error('Limite de 2000 arquivos por lote excedido.');
  }

  if (!isValidQuality(data.quality)) {
    throw new Error('Qualidade JPEG inválida.');
  }

  const outputDir = assertSafeAbsolutePath(data.outputDir, 'Pasta de saída');

  const files = data.files.map((file, index) => {
    if (!file || typeof file !== 'object') {
      throw new Error(`Arquivo inválido no índice ${index}.`);
    }
    if (typeof file.id !== 'string' || file.id.length === 0) {
      throw new Error(`ID inválido no índice ${index}.`);
    }
    if (typeof file.name !== 'string' || file.name.length === 0) {
      throw new Error(`Nome inválido no índice ${index}.`);
    }
    if (typeof file.size !== 'number' || file.size < 0) {
      throw new Error(`Tamanho inválido no índice ${index}.`);
    }

    return {
      id: file.id,
      name: file.name,
      size: file.size,
      path: assertSafeAbsolutePath(file.path, `Arquivo ${file.name}`),
    };
  });

  return {
    files,
    outputDir,
    quality: data.quality,
  };
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_APP_INFO, () => ({
    name: APP_META.name,
    version: app.getVersion() || APP_META.version,
    platform: process.platform,
  }));

  ipcMain.handle(IPC_CHANNELS.GET_DEFAULT_OUTPUT_DIR, async () => {
    const documents = app.getPath('documents');
    return getDefaultConvertedDir(documents);
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_FILES, async () => {
    const result = await showOpenDialog({
      title: 'Selecionar arquivos HEIC/HEIF',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Imagens HEIC/HEIF', extensions: ['heic', 'heif'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    });

    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  });

  ipcMain.handle(
    IPC_CHANNELS.SELECT_OUTPUT_DIR,
    async (_event, defaultPath?: string) => {
      const options: Electron.OpenDialogOptions = {
        title: 'Escolher pasta de destino',
        properties: ['openDirectory', 'createDirectory'],
      };

      if (typeof defaultPath === 'string' && defaultPath.trim().length > 0) {
        try {
          options.defaultPath = assertSafeAbsolutePath(defaultPath, 'Pasta padrão');
        } catch {
          // ignora defaultPath inválido
        }
      }

      const result = await showOpenDialog(options);

      return {
        canceled: result.canceled,
        path: result.canceled ? null : (result.filePaths[0] ?? null),
      };
    },
  );

  ipcMain.handle(IPC_CHANNELS.RESOLVE_PATHS, async (_event, paths: unknown) => {
    if (!Array.isArray(paths) || !paths.every((p) => typeof p === 'string')) {
      throw new Error('Caminhos inválidos.');
    }
    return resolveHeicPaths(paths);
  });

  ipcMain.handle(
    IPC_CHANNELS.CONVERT_BATCH,
    async (_event, payload: unknown): Promise<ConvertBatchSummary> => {
      if (conversionSignal && !conversionSignal.cancelled) {
        throw new Error('Já existe uma conversão em andamento.');
      }

      const request = validateConvertRequest(payload);
      conversionSignal = { cancelled: false };
      const signal = conversionSignal;

      try {
        const summary = await convertBatch({
          files: request.files,
          outputDir: request.outputDir,
          quality: request.quality,
          signal,
          onFileProgress: (fileId, progress) => {
            const event: ConvertProgressEvent = {
              fileId,
              progress,
              status: 'converting',
            };
            sendToRenderer(IPC_CHANNELS.CONVERT_PROGRESS, event);
          },
          onFileDone: (result: ConvertFileResult) => {
            sendToRenderer(IPC_CHANNELS.CONVERT_FILE_DONE, result);
          },
        });

        return summary;
      } finally {
        conversionSignal = null;
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.CONVERT_CANCEL, async () => {
    if (conversionSignal) {
      conversionSignal.cancelled = true;
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, targetPath: unknown) => {
    const safePath = assertSafeAbsolutePath(targetPath, 'Caminho');
    return shell.openPath(safePath);
  });
}
