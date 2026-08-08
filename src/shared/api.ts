import type {
  AppInfo,
  ConvertBatchRequest,
  ConvertBatchSummary,
  ConvertFileResult,
  ConvertProgressEvent,
  GetPreviewResult,
  ResolvePathsResult,
  SelectFilesResult,
  SelectOutputDirResult,
} from './types';

export interface HeicConverterApi {
  selectFiles: () => Promise<SelectFilesResult>;
  selectOutputDir: (defaultPath?: string) => Promise<SelectOutputDirResult>;
  resolvePaths: (paths: string[]) => Promise<ResolvePathsResult>;
  getDefaultOutputDir: () => Promise<string>;
  convertBatch: (request: ConvertBatchRequest) => Promise<ConvertBatchSummary>;
  cancelConversion: () => Promise<void>;
  openPath: (targetPath: string) => Promise<string>;
  getAppInfo: () => Promise<AppInfo>;
  getPathForFile: (file: File) => string;
  getPreview: (filePath: string) => Promise<GetPreviewResult>;
  clearPreviewCache: () => Promise<void>;
  onConvertProgress: (callback: (event: ConvertProgressEvent) => void) => () => void;
  onConvertFileDone: (callback: (result: ConvertFileResult) => void) => () => void;
}
