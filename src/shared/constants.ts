/**
 * Metadados centralizados do aplicativo.
 * Altere aqui para refletir em build, UI e empacotamento.
 */
export const APP_META = {
  name: 'HEIC Converter',
  version: '1.0.0',
  description: 'Conversor offline de imagens HEIC/HEIF para JPG',
  author: 'HEIC Converter',
  defaultOutputFolderName: 'Converted',
  defaultJpegQuality: 95 as const,
  supportedExtensions: ['.heic', '.heif'] as const,
} as const;

export type JpegQuality = 80 | 90 | 95 | 100;

export const JPEG_QUALITY_OPTIONS: readonly JpegQuality[] = [80, 90, 95, 100];

export const IPC_CHANNELS = {
  SELECT_FILES: 'dialog:select-files',
  SELECT_OUTPUT_DIR: 'dialog:select-output-dir',
  RESOLVE_PATHS: 'fs:resolve-paths',
  GET_DEFAULT_OUTPUT_DIR: 'fs:get-default-output-dir',
  CONVERT_BATCH: 'convert:batch',
  CONVERT_PROGRESS: 'convert:progress',
  CONVERT_FILE_DONE: 'convert:file-done',
  CONVERT_CANCEL: 'convert:cancel',
  OPEN_PATH: 'shell:open-path',
  GET_APP_INFO: 'app:get-info',
  GET_PREVIEW: 'preview:get',
  CLEAR_PREVIEW_CACHE: 'preview:clear-cache',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
