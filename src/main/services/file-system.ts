import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { APP_META } from '../../shared/constants';
import type { ResolvePathsResult, SourceFileInfo } from '../../shared/types';
import { assertSafeAbsolutePath, isSupportedImageExtension } from './path-utils';

async function collectFromEntry(
  entryPath: string,
  files: SourceFileInfo[],
  ignoredNames: string[],
): Promise<void> {
  const safePath = assertSafeAbsolutePath(entryPath, 'Caminho');
  let stats;

  try {
    stats = await fs.stat(safePath);
  } catch {
    ignoredNames.push(path.basename(safePath));
    return;
  }

  if (stats.isDirectory()) {
    const children = await fs.readdir(safePath, { withFileTypes: true });
    for (const child of children) {
      // Ignora pastas ocultas / sistema
      if (child.name.startsWith('.')) {
        continue;
      }
      await collectFromEntry(path.join(safePath, child.name), files, ignoredNames);
    }
    return;
  }

  if (!stats.isFile()) {
    ignoredNames.push(path.basename(safePath));
    return;
  }

  if (!isSupportedImageExtension(safePath)) {
    ignoredNames.push(path.basename(safePath));
    return;
  }

  files.push({
    id: randomUUID(),
    path: safePath,
    name: path.basename(safePath),
    size: stats.size,
  });
}

export async function resolveHeicPaths(paths: string[]): Promise<ResolvePathsResult> {
  if (!Array.isArray(paths)) {
    throw new Error('Lista de caminhos inválida.');
  }

  if (paths.length > 5000) {
    throw new Error('Muitos caminhos de uma só vez. Limite: 5000.');
  }

  const files: SourceFileInfo[] = [];
  const ignoredNames: string[] = [];
  const seen = new Set<string>();

  for (const entry of paths) {
    const before = files.length;
    await collectFromEntry(entry, files, ignoredNames);

    // Deduplicar por caminho absoluto
    for (let i = before; i < files.length; i += 1) {
      const file = files[i];
      const key = file.path.toLowerCase();
      if (seen.has(key)) {
        files.splice(i, 1);
        i -= 1;
        continue;
      }
      seen.add(key);
    }
  }

  // Limitar nomes ignorados reportados para não sobrecarregar a UI
  const uniqueIgnored = [...new Set(ignoredNames)].slice(0, 30);

  return {
    files,
    ignoredCount: ignoredNames.length,
    ignoredNames: uniqueIgnored,
  };
}

export async function ensureOutputDirectory(outputDir: string): Promise<string> {
  const safeDir = assertSafeAbsolutePath(outputDir, 'Pasta de saída');
  await fs.mkdir(safeDir, { recursive: true });
  return safeDir;
}

export async function getDefaultConvertedDir(documentsPath: string): Promise<string> {
  const safeDocuments = assertSafeAbsolutePath(documentsPath, 'Pasta Documentos');
  return path.join(safeDocuments, APP_META.defaultOutputFolderName);
}

export async function listExistingFileNames(dirPath: string): Promise<Set<string>> {
  const names = new Set<string>();

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        names.add(entry.name.toLowerCase());
      }
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      throw error;
    }
  }

  return names;
}
