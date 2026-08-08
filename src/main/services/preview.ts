import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { GetPreviewResult } from '../../shared/types';
import { assertSafeAbsolutePath, isSupportedImageExtension } from './path-utils';

interface QueueItem {
  id: string;
  filePath: string;
  resolve: (result: GetPreviewResult) => void;
}

const previewCache = new Map<string, string>();
const inflight = new Map<string, Promise<GetPreviewResult>>();

const queue: QueueItem[] = [];
let worker: Worker | null = null;
let processing = false;
let currentItem: QueueItem | null = null;

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(path.join(__dirname, 'preview-worker.js'));

  worker.on('message', (message: GetPreviewResult & { id: string }) => {
    const item = currentItem;
    currentItem = null;
    processing = false;

    if (item && item.id === message.id) {
      if (message.dataUrl) {
        previewCache.set(item.filePath, message.dataUrl);
      }
      item.resolve({
        path: message.path,
        dataUrl: message.dataUrl,
        error: message.error,
      });
    }

    pumpQueue();
  });

  worker.on('error', (error) => {
    const item = currentItem;
    currentItem = null;
    processing = false;
    worker = null;

    if (item) {
      item.resolve({
        path: item.filePath,
        error: error.message || 'Worker de preview falhou.',
      });
    }

    pumpQueue();
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      const item = currentItem;
      currentItem = null;
      processing = false;
      worker = null;

      if (item) {
        item.resolve({
          path: item.filePath,
          error: `Worker de preview encerrou (código ${code}).`,
        });
      }

      pumpQueue();
    }
  });

  return worker;
}

function pumpQueue(): void {
  if (processing || queue.length === 0) {
    return;
  }

  const item = queue.shift();
  if (!item) {
    return;
  }

  processing = true;
  currentItem = item;

  try {
    getWorker().postMessage({ id: item.id, filePath: item.filePath });
  } catch (error) {
    processing = false;
    currentItem = null;
    item.resolve({
      path: item.filePath,
      error: error instanceof Error ? error.message : 'Falha ao iniciar preview.',
    });
    pumpQueue();
  }
}

function enqueuePreview(filePath: string): Promise<GetPreviewResult> {
  return new Promise((resolve) => {
    queue.push({
      id: randomUUID(),
      filePath,
      resolve,
    });
    pumpQueue();
  });
}

export function clearPreviewCache(): void {
  previewCache.clear();
  inflight.clear();
  // Itens ainda na fila recebem cancelamento leve
  while (queue.length > 0) {
    const item = queue.shift();
    item?.resolve({
      path: item.filePath,
      error: 'Preview cancelado.',
    });
  }
}

export async function getHeicPreview(filePath: unknown): Promise<GetPreviewResult> {
  const safePath = assertSafeAbsolutePath(filePath, 'Arquivo de preview');

  if (!isSupportedImageExtension(safePath)) {
    return {
      path: safePath,
      error: 'Formato não suportado para preview.',
    };
  }

  const cached = previewCache.get(safePath);
  if (cached) {
    return { path: safePath, dataUrl: cached };
  }

  const pending = inflight.get(safePath);
  if (pending) {
    return pending;
  }

  const task = enqueuePreview(safePath).finally(() => {
    inflight.delete(safePath);
  });

  inflight.set(safePath, task);
  return task;
}
