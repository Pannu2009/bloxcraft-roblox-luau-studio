// projectZipImport.ts — import a .zip of Luau files as a new BloxCraft project.
// The zip is unzipped in-memory; every .luau/.lua file becomes a ScriptFile.
// Script type is guessed from the file's folder or name.

import JSZip from 'jszip';
import type { RobloxProject, ScriptFile, ScriptType } from '../types/roblox';

function guessType(path: string): { type: ScriptType; folder: string } {
  const lower = path.toLowerCase();
  const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : 'src';

  if (lower.includes('src/server') || lower.includes('/server/') || /\.server\.lua[u]?$/.test(lower)) {
    return { type: 'ServerScript', folder };
  }
  if (lower.includes('src/client') || lower.includes('/client/') || /\.client\.lua[u]?$/.test(lower)) {
    return { type: 'LocalScript', folder };
  }
  return { type: 'ModuleScript', folder };
}

export async function importProjectFromZip(zipFile: File): Promise<RobloxProject> {
  const zip = await JSZip.loadAsync(zipFile);
  const now = Date.now();
  const files: ScriptFile[] = [];
  let i = 0;

  const entries: Array<[string, JSZip.JSZipObject]> = [];
  zip.forEach((relativePath, entry) => {
    if (!entry.dir && /\.lua[u]?$/i.test(relativePath)) {
      entries.push([relativePath, entry]);
    }
  });

  if (entries.length === 0) {
    throw new Error('No .luau or .lua files found in this ZIP.');
  }

  // Strip a single common root folder (e.g. "mygame/src/server/x.luau" -> keep full path as folder)
  for (const [relativePath, entry] of entries) {
    const code = await entry.async('string');
    const name = relativePath.slice(relativePath.lastIndexOf('/') + 1);
    const { type, folder } = guessType(relativePath);
    const suggestedPlacement =
      type === 'ServerScript'
        ? 'ServerScriptService'
        : type === 'LocalScript'
        ? 'StarterPlayerScripts'
        : 'ReplicatedStorage';
    files.push({
      id: `f-import-${now}-${i++}`,
      name,
      type,
      folder,
      code,
      suggestedPlacement,
    });
  }

  const projectName = zipFile.name.replace(/\.zip$/i, '').replace(/[_-]+/g, ' ').trim() || 'Imported Project';

  return {
    id: `proj-import-${now}`,
    name: projectName,
    description: `Imported from ${zipFile.name} (${files.length} scripts)`,
    template: 'rpg',
    createdAt: now,
    updatedAt: now,
    files,
  };
}
