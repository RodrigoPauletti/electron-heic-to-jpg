import type { JpegQuality } from './constants';

export type FileStatus =
  | 'pending'
  | 'converting'
  | 'done'
  | 'error'
  | 'skipped';

export interface SourceFileInfo {
  id: string;
  path: string;
  name: string;
  size: number;
}

export interface QueueFile extends SourceFileInfo {
  status: FileStatus;
  progress: number;
  error?: string;
  outputPath?: string;
}

export interface ConvertBatchRequest {
  files: SourceFileInfo[];
  outputDir: string;
  quality: JpegQuality;
}

export interface ConvertProgressEvent {
  fileId: string;
  progress: number;
  status: FileStatus;
}

export interface ConvertFileResult {
  fileId: string;
  status: 'done' | 'error' | 'skipped';
  outputPath?: string;
  error?: string;
}

export interface ConvertBatchSummary {
  converted: number;
  failed: number;
  skipped: number;
  outputDir: string;
  cancelled: boolean;
}

export interface ResolvePathsResult {
  files: SourceFileInfo[];
  ignoredCount: number;
  ignoredNames: string[];
}

export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
}

export interface SelectFilesResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SelectOutputDirResult {
  canceled: boolean;
  path: string | null;
}
