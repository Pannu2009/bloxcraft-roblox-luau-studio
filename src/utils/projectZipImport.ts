// projectZipImport.ts — import a .zip of Luau files as a new BloxCraft project.
// The zip is unzipped in-memory; every .luau/.lua file becomes a ScriptFile.
// Folders are normalized to Rojo-style layout:
//   ServerScriptService/...      -> src/server   (ServerScript)
//   StarterPlayerScripts/...     -> src/client   (LocalScript)
//   ReplicatedStorage/...        -> src/shared   (ModuleScript)
//   src/server|client|shared     -> kept as-is
//   Shared/, Server/, Client/    -> src/shared, src/server, src/client

import JSZip from 'jszip';
import type { RobloxProject, ScriptFile, ScriptType } from '../types/roblox';

function segments(p: string): string[] {
  return p.split('\\').join('/').replace(/^\.\//, '').split('/').filter(Boolean);
}

// Roblox service name -> Rojo folder + script type
const SERVICE_MAP: Array<{ match: RegExp; folder: string; type: ScriptType }> = [
  { match: /^serverscriptservice$/i, folder: 'src/server', type: 'ServerScript' },
  { match: /^starterplayerscripts$/i, folder: 'src/client', type: 'LocalScript' },
  { match: /^startercharacterscripts$/i, folder: 'src/client', type: 'LocalScript' },
  { match: /^replicatedfirst$/i, folder: 'src/client', type: 'LocalScript' },
  { match: /^replicatedstorage$/i, folder: 'src/shared', type: 'ModuleScript' },
  { match: /^serverstorage$/i, folder: 'src/storage', type: 'ModuleScript' },
  { match: /^serverscripts$/i, folder: 'src/server', type: 'ServerScript' },
  { match: /^localscripts$/i, folder: 'src/client', type: 'LocalScript' },
];

function folderForServiceRest(mapped: string, rest: string[]): string {
  return rest.length > 0 ? `${mapped}/${rest.join('/')}` : mapped;
}

// Map a raw dir like "Shared/Util" onto a base like "src/shared" -> "src/shared/Util".
function folderFromDir(segs: string[], base: string): string {
  const rest = segs.slice(1, -1);
  return rest.length > 0 ? `${base}/${rest.join('/')}` : base;
}

export function guessScriptType(filePath: string): { type: ScriptType; folder: string } {
  const segs = segments(filePath);
  const name = segs[segs.length - 1] || 'script.luau';

  // Explicit name suffixes always win for the type.
  if (/\.server\.lua[u]?$/i.test(name)) {
    return { type: 'ServerScript', folder: folderFromDir(segs, 'src/server') };
  }
  if (/\.client\.lua[u]?$/i.test(name)) {
    return { type: 'LocalScript', folder: folderFromDir(segs, 'src/client') };
  }

  // Roblox service folders (Studio export layout).
  for (let i = 0; i < segs.length - 1; i++) {
    const svc = SERVICE_MAP.find((s) => s.match.test(segs[i]));
    if (svc) {
      return {
        type: svc.type,
        folder: folderForServiceRest(svc.folder, segs.slice(i + 1, -1)),
      };
    }
  }

  // Rojo-style src/* layout, kept as-is.
  const dir = segs.slice(0, -1).join('/');
  const lowerDir = dir.toLowerCase();
  if (lowerDir === 'src/server' || lowerDir.endsWith('/server')) {
    return { type: 'ServerScript', folder: dir };
  }
  if (lowerDir === 'src/client' || lowerDir.endsWith('/client')) {
    return { type: 'LocalScript', folder: dir };
  }
  if (lowerDir === 'src/shared' || lowerDir.endsWith('/shared') || lowerDir.endsWith('/modules')) {
    return { type: 'ModuleScript', folder: dir };
  }

  // Bare well-known folder names get settled into src/*.
  const first = (segs[0] || '').toLowerCase();
  if (first === 'server') return { type: 'ServerScript', folder: folderFromDir(segs, 'src/server') };
  if (first === 'client') return { type: 'LocalScript', folder: folderFromDir(segs, 'src/client') };
  if (first === 'shared' || first === 'modules') {
    return { type: 'ModuleScript', folder: folderFromDir(segs, 'src/shared') };
  }

  return { type: 'ModuleScript', folder: dir || 'src/shared' };
}

// Strip a single common root folder shared by every entry
// (e.g. "mygame/src/server/x.luau" -> "src/server/x.luau").
function stripCommonRoot(paths: string[]): string[] {
  if (paths.length === 0) return paths;
  const all = paths.map(segments);
  if (all.some((s) => s.length < 2)) return paths;
  const first = all[0][0];
  if (all.every((s) => s[0].toLowerCase() === first.toLowerCase())) {
    return all.map((s) => s.slice(1).join('/'));
  }
  return paths;
}

export function suggestedPlacementFor(type: ScriptType): string {
  return type === 'ServerScript'
    ? 'ServerScriptService'
    : type === 'LocalScript'
    ? 'StarterPlayerScripts'
    : 'ReplicatedStorage';
}

export async function importProjectFromZip(zipFile: File): Promise<RobloxProject> {
  const zip = await JSZip.loadAsync(zipFile);
  const now = Date.now();

  const entries: Array<[string, JSZip.JSZipObject]> = [];
  zip.forEach((relativePath, entry) => {
    if (!entry.dir && /\.lua[u]?$/i.test(relativePath)) {
      entries.push([relativePath, entry]);
    }
  });

  if (entries.length === 0) {
    throw new Error('No .luau or .lua files found in this ZIP.');
  }

  const stripped = stripCommonRoot(entries.map(([p]) => p));
  const files: ScriptFile[] = [];

  for (let i = 0; i < entries.length; i++) {
    const [, entry] = entries[i];
    const code = await entry.async('string');
    const cleanPath = stripped[i];
    const name = cleanPath.slice(cleanPath.lastIndexOf('/') + 1);
    const { type, folder } = guessScriptType(cleanPath);
    files.push({
      id: `f-import-${now}-${i}`,
      name,
      type,
      folder,
      code,
      suggestedPlacement: suggestedPlacementFor(type),
    });
  }

  const projectName =
    zipFile.name.replace(/\.zip$/i, '').replace(/[_-]+/g, ' ').trim() || 'Imported Project';

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
