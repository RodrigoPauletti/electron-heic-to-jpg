import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type { HeicConverterApi } from '../shared/api';
import type {
  ConvertBatchRequest,
  ConvertFileResult,
  ConvertProgressEvent,
} from '../shared/types';

const api: HeicConverterApi = {
  selectFiles: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FILES),

  selectOutputDir: (defaultPath?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_OUTPUT_DIR, defaultPath),

  resolvePaths: (paths: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.RESOLVE_PATHS, paths),

  getDefaultOutputDir: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DEFAULT_OUTPUT_DIR),

  convertBatch: (request: ConvertBatchRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONVERT_BATCH, request),

  cancelConversion: () => ipcRenderer.invoke(IPC_CHANNELS.CONVERT_CANCEL),

  openPath: (targetPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_PATH, targetPath),

  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_INFO),

  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  onConvertProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ConvertProgressEvent) => {
      callback(payload);
    };
    ipcRenderer.on(IPC_CHANNELS.CONVERT_PROGRESS, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CONVERT_PROGRESS, listener);
    };
  },

  onConvertFileDone: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ConvertFileResult) => {
      callback(payload);
    };
    ipcRenderer.on(IPC_CHANNELS.CONVERT_FILE_DONE, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CONVERT_FILE_DONE, listener);
    };
  },
};

contextBridge.exposeInMainWorld('heicConverter', api);
