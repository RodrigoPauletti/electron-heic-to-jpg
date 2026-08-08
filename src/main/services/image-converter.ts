import fs from 'node:fs/promises';
import path from 'node:path';
import convert from 'heic-convert';
import type { JpegQuality } from '../../shared/constants';
import type { ConvertFileResult, SourceFileInfo } from '../../shared/types';
import { listExistingFileNames, ensureOutputDirectory } from './file-system';
import {
  assertSafeAbsolutePath,
  buildUniqueFileName,
  isSupportedImageExtension,
  toJpgFileName,
} from './path-utils';

export interface ConvertOneOptions {
  file: SourceFileInfo;
  outputDir: string;
  quality: JpegQuality;
  existingNames: Set<string>;
  signal?: { cancelled: boolean };
  onProgress?: (progress: number) => void;
}

function qualityToFraction(quality: JpegQuality): number {
  return Math.min(1, Math.max(0.01, quality / 100));
}

/**
 * Converte um arquivo HEIC/HEIF para JPEG usando heic-convert (libheif via WASM).
 *
 * Observações:
 * - A decodificação via libheif aplica a orientação da imagem.
 * - Metadados EXIF completos não são preservados pelo encoder JPEG do heic-convert;
 *   priorizamos fidelidade visual, orientação correta e empacotamento multiplataforma.
 */
export async function convertHeicToJpeg(
  options: ConvertOneOptions,
): Promise<ConvertFileResult> {
  const { file, outputDir, quality, existingNames, signal, onProgress } = options;

  try {
    if (signal?.cancelled) {
      return { fileId: file.id, status: 'skipped', error: 'Conversão cancelada.' };
    }

    const inputPath = assertSafeAbsolutePath(file.path, 'Arquivo de entrada');
    const safeOutputDir = assertSafeAbsolutePath(outputDir, 'Pasta de saída');

    if (!isSupportedImageExtension(inputPath)) {
      return {
        fileId: file.id,
        status: 'error',
        error: 'Formato não suportado. Use .heic ou .heif.',
      };
    }

    onProgress?.(5);

    const inputBuffer = await fs.readFile(inputPath);
    onProgress?.(25);

    if (signal?.cancelled) {
      return { fileId: file.id, status: 'skipped', error: 'Conversão cancelada.' };
    }

    if (inputBuffer.byteLength === 0) {
      return {
        fileId: file.id,
        status: 'error',
        error: 'Arquivo vazio ou inválido.',
      };
    }

    let outputBuffer: Buffer;

    try {
      // heic-convert tipa o retorno como ArrayBufferLike; garantimos Buffer.
      const converted = await convert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: qualityToFraction(quality),
      });
      outputBuffer = Buffer.from(converted);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao decodificar HEIC/HEIF.';
      return {
        fileId: file.id,
        status: 'error',
        error: `Arquivo HEIC inválido ou corrompido: ${message}`,
      };
    }

    onProgress?.(75);

    if (signal?.cancelled) {
      return { fileId: file.id, status: 'skipped', error: 'Conversão cancelada.' };
    }

    await ensureOutputDirectory(safeOutputDir);

    const desiredName = toJpgFileName(file.name);
    const uniqueName = buildUniqueFileName(desiredName, existingNames);
    const outputPath = path.join(safeOutputDir, uniqueName);

    // Marca o nome como reservado antes de escrever (evita colisão no lote)
    existingNames.add(uniqueName.toLowerCase());

    await fs.writeFile(outputPath, outputBuffer);
    onProgress?.(100);

    return {
      fileId: file.id,
      status: 'done',
      outputPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido.';
    return {
      fileId: file.id,
      status: 'error',
      error: message,
    };
  }
}

export interface ConvertBatchOptions {
  files: SourceFileInfo[];
  outputDir: string;
  quality: JpegQuality;
  signal: { cancelled: boolean };
  onFileProgress: (fileId: string, progress: number) => void;
  onFileDone: (result: ConvertFileResult) => void;
}

export async function convertBatch(options: ConvertBatchOptions): Promise<{
  converted: number;
  failed: number;
  skipped: number;
  outputDir: string;
  cancelled: boolean;
}> {
  const { files, outputDir, quality, signal, onFileProgress, onFileDone } = options;
  const safeOutputDir = await ensureOutputDirectory(outputDir);
  const existingNames = await listExistingFileNames(safeOutputDir);

  let converted = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of files) {
    if (signal.cancelled) {
      skipped += files.length - (converted + failed + skipped);
      break;
    }

    onFileProgress(file.id, 0);

    const result = await convertHeicToJpeg({
      file,
      outputDir: safeOutputDir,
      quality,
      existingNames,
      signal,
      onProgress: (progress) => onFileProgress(file.id, progress),
    });

    onFileDone(result);

    if (result.status === 'done') {
      converted += 1;
    } else if (result.status === 'skipped') {
      skipped += 1;
    } else {
      failed += 1;
    }

    // Cedê o event loop entre arquivos para manter a UI responsiva
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  return {
    converted,
    failed,
    skipped,
    outputDir: safeOutputDir,
    cancelled: signal.cancelled,
  };
}
