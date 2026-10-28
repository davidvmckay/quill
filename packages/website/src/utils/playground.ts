import { decompressFromEncodedURIComponent } from 'lz-string';
import type { SourceFiles } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function readOverrides(hash: string): SourceFiles {
  if (!hash.startsWith('#code')) return {};
  try {
    const decoded = decompressFromEncodedURIComponent(hash.slice(5).trim());
    if (!decoded) return {};
    const value: unknown = JSON.parse(decoded);
    if (!isRecord(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ));
  } catch {
    return {};
  }
}

export interface PlaygroundMetadata {
  template: 'static' | 'react-ts' | 'vanilla-ts';
  activeFile?: string;
  externalResources?: string[];
}

export function readMetadata(raw: string): PlaygroundMetadata {
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value)) throw new Error('Playground metadata must be an object');
  const template = value.template ?? 'static';
  if (template !== 'static' && template !== 'react-ts' && template !== 'vanilla-ts') {
    throw new Error(`Unsupported playground template: ${String(template)}`);
  }
  if (value.activeFile !== undefined && typeof value.activeFile !== 'string') {
    throw new Error('Playground activeFile must be a string');
  }
  if (value.externalResources !== undefined && (!Array.isArray(value.externalResources)
    || !value.externalResources.every((resource: unknown) => typeof resource === 'string'))) {
    throw new Error('Playground externalResources must contain strings');
  }
  return { template, activeFile: value.activeFile, externalResources: value.externalResources };
}
