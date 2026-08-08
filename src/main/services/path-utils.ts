import path from 'node:path';
import { APP_META } from '../../shared/constants';

const SUPPORTED = new Set(
  APP_META.supportedExtensions.map((ext) => ext.toLowerCase()),
);

/**
 * Valida se um caminho de arquivo/pasta é absoluto e não contém
 * sequências perigosas óbvias. Não resolve symlinks aqui —
 * isso fica a cargo do consumidor com fs.realpath quando necessário.
 */
export function assertSafeAbsolutePath(input: unknown, label: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new Error(`${label} inválido.`);
  }

  const normalized = path.normalize(input.trim());

  if (!path.isAbsolute(normalized)) {
    throw new Error(`${label} deve ser um caminho absoluto.`);
  }

  if (normalized.includes('\0')) {
    throw new Error(`${label} contém caracteres inválidos.`);
  }

  return normalized;
}

export function isSupportedImageExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED.has(ext as (typeof APP_META.supportedExtensions)[number]);
}

export function toJpgFileName(sourceName: string): string {
  const parsed = path.parse(sourceName);
  return `${parsed.name}.jpg`;
}

/**
 * Gera um nome único no estilo: foto.jpg, foto (1).jpg, foto (2).jpg
 */
export function buildUniqueFileName(
  desiredName: string,
  existingNames: Set<string>,
): string {
  const parsed = path.parse(desiredName);
  const base = parsed.name;
  const ext = parsed.ext;

  let candidate = desiredName;
  let counter = 1;

  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${base} (${counter})${ext}`;
    counter += 1;
  }

  return candidate;
}
