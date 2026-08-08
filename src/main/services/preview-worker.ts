import { parentPort } from 'node:worker_threads';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import decode from 'heic-decode';
import jpegJs from 'jpeg-js';

const execFileAsync = promisify(execFile);

const PREVIEW_JPEG_QUALITY = 35;
const PREVIEW_MAX_EDGE = 240;
const MAX_PREVIEW_BYTES = 40 * 1024 * 1024;

interface WorkerRequest {
  id: string;
  filePath: string;
}

interface WorkerResponse {
  id: string;
  path: string;
  dataUrl?: string;
  error?: string;
}

interface HeicImageSource {
  width: number;
  height: number;
  decode: () => Promise<{
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }>;
}

interface HeicImageList extends Array<HeicImageSource> {
  dispose: () => void;
}

function pickPreviewSource(images: HeicImageSource[]): HeicImageSource {
  if (images.length === 1) {
    return images[0];
  }

  const ranked = images.map((image) => ({
    image,
    area: image.width * image.height,
    maxEdge: Math.max(image.width, image.height),
  }));

  const thumbs = ranked
    .filter((item) => item.maxEdge >= 48 && item.maxEdge <= 1280)
    .sort((a, b) => b.area - a.area);

  if (thumbs.length > 0) {
    return thumbs[0].image;
  }

  ranked.sort((a, b) => a.area - b.area);
  return ranked[0].image;
}

function downscale(
  source: { width: number; height: number; data: Uint8ClampedArray },
  maxEdge: number,
): { width: number; height: number; data: Uint8ClampedArray } {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  if (scale >= 0.999) {
    return source;
  }

  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const srcY = Math.min(source.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const srcX = Math.min(source.width - 1, Math.floor(x / scale));
      const srcIdx = (srcY * source.width + srcX) * 4;
      const dstIdx = (y * width + x) * 4;
      data[dstIdx] = source.data[srcIdx];
      data[dstIdx + 1] = source.data[srcIdx + 1];
      data[dstIdx + 2] = source.data[srcIdx + 2];
      data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }

  return { width, height, data };
}

async function generateWithSips(filePath: string): Promise<string> {
  const tmpOut = path.join(os.tmpdir(), `heic-preview-${randomUUID()}.jpg`);

  try {
    await execFileAsync('sips', [
      '-Z',
      String(PREVIEW_MAX_EDGE),
      '-s',
      'format',
      'jpeg',
      filePath,
      '--out',
      tmpOut,
    ], {
      timeout: 15000,
      maxBuffer: 8 * 1024 * 1024,
    });

    const jpegBuffer = await fs.readFile(tmpOut);
    return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
  } finally {
    await fs.unlink(tmpOut).catch(() => undefined);
  }
}

async function generateWithHeicDecode(filePath: string): Promise<string> {
  let images: HeicImageList | null = null;

  try {
    const inputBuffer = await fs.readFile(filePath);
    images = (await decode.all({ buffer: inputBuffer })) as unknown as HeicImageList;

    if (!images.length) {
      throw new Error('Nenhuma imagem encontrada no HEIC.');
    }

    const source = pickPreviewSource(images);
    const decoded = await source.decode();
    const resized = downscale(decoded, PREVIEW_MAX_EDGE);
    const encoded = jpegJs.encode(
      {
        data: resized.data,
        width: resized.width,
        height: resized.height,
      },
      PREVIEW_JPEG_QUALITY,
    );

    return `data:image/jpeg;base64,${Buffer.from(encoded.data).toString('base64')}`;
  } finally {
    images?.dispose();
  }
}

async function generatePreview(filePath: string): Promise<WorkerResponse['dataUrl'] | never> {
  const stats = await fs.stat(filePath);

  if (!stats.isFile()) {
    throw new Error('Caminho não é um arquivo.');
  }
  if (stats.size > MAX_PREVIEW_BYTES) {
    throw new Error('Arquivo muito grande para gerar preview.');
  }
  if (stats.size === 0) {
    throw new Error('Arquivo vazio.');
  }

  if (process.platform === 'darwin') {
    try {
      return await generateWithSips(filePath);
    } catch {
      // Fallback se sips falhar
    }
  }

  return generateWithHeicDecode(filePath);
}

parentPort?.on('message', async (message: WorkerRequest) => {
  try {
    const dataUrl = await generatePreview(message.filePath);
    const response: WorkerResponse = {
      id: message.id,
      path: message.filePath,
      dataUrl,
    };
    parentPort?.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id: message.id,
      path: message.filePath,
      error: error instanceof Error ? error.message : 'Falha ao gerar preview.',
    };
    parentPort?.postMessage(response);
  }
});
