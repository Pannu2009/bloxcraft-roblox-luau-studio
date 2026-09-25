// githubSync.ts — per-project GitHub sync via the Git Data API.
// The user's personal access token is stored in localStorage on their device only.

import type { RobloxProject } from '../types/roblox';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

const API = 'https://api.github.com';
const storageKey = (projectId: string) => `bloxcraft_github_${projectId}`;

export function loadGitHubConfig(projectId: string): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (cfg && cfg.token && cfg.owner && cfg.repo) {
      return { branch: 'main', ...cfg };
    }
  } catch {}
  return null;
}

export function saveGitHubConfig(projectId: string, cfg: GitHubConfig): void {
  localStorage.setItem(storageKey(projectId), JSON.stringify(cfg));
}

export function clearGitHubConfig(projectId: string): void {
  localStorage.removeItem(storageKey(projectId));
}

async function gh(path: string, token: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j.message || '';
    } catch {
      detail = await res.text();
    }
    throw new Error(`GitHub ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function b64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Validate token + repo + branch. Throws with a human-readable message on failure. */
export async function validateGitHubConfig(cfg: GitHubConfig): Promise<{ defaultBranch: string }> {
  const repo = await gh(`/repos/${cfg.owner}/${cfg.repo}`, cfg.token);
  try {
    await gh(`/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${cfg.branch}`, cfg.token);
  } catch (e: any) {
    throw new Error(
      `Connected, but branch "${cfg.branch}" was not found in ${cfg.owner}/${cfg.repo}. Check the branch name.`
    );
  }
  return { defaultBranch: repo.default_branch as string };
}

/** Push all project scripts to the connected repo/branch. Returns the new commit SHA. */
export async function pushProjectToGitHub(
  project: RobloxProject,
  cfg: GitHubConfig,
  message?: string
): Promise<string> {
  const base = `${cfg.owner}/${cfg.repo}`;

  const ref = await gh(`/repos/${base}/git/ref/heads/${cfg.branch}`, cfg.token);
  const baseSha: string = ref.object.sha;
  const baseCommit = await gh(`/repos/${base}/git/commits/${baseSha}`, cfg.token);
  const baseTree: string = baseCommit.tree.sha;

  const entries: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  for (const f of project.files) {
    const blob = await gh(`/repos/${base}/git/blobs`, cfg.token, {
      method: 'POST',
      body: JSON.stringify({ content: f.code, encoding: 'utf-8' }),
    });
    entries.push({
      path: `${f.folder || 'src'}/${f.name}`,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  const tree = await gh(`/repos/${base}/git/trees`, cfg.token, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTree, tree: entries }),
  });

  const newCommit = await gh(`/repos/${base}/git/commits`, cfg.token, {
    method: 'POST',
    body: JSON.stringify({
      message: message || `BloxCraft sync: ${project.name} (${project.files.length} scripts)`,
      tree: tree.sha,
      parents: [baseSha],
    }),
  });

  await gh(`/repos/${base}/git/ref/heads/${cfg.branch}`, cfg.token, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return newCommit.sha as string;
}

export interface PulledFile {
  path: string;
  folder: string;
  name: string;
  code: string;
}

/** Pull all .luau/.lua files from the connected repo/branch. */
export async function pullProjectFromGitHub(cfg: GitHubConfig): Promise<PulledFile[]> {
  const base = `${cfg.owner}/${cfg.repo}`;
  const ref = await gh(`/repos/${base}/git/ref/heads/${cfg.branch}`, cfg.token);
  const tree = await gh(`/repos/${base}/git/trees/${ref.object.sha}?recursive=1`, cfg.token);

  const files: PulledFile[] = [];
  for (const item of tree.tree || []) {
    if (item.type === 'blob' && /\.lua[u]?$/i.test(item.path)) {
      const blob = await gh(`/repos/${base}/git/blobs/${item.sha}`, cfg.token);
      const slash = item.path.lastIndexOf('/');
      files.push({
        path: item.path,
        folder: slash >= 0 ? item.path.slice(0, slash) : 'src',
        name: slash >= 0 ? item.path.slice(slash + 1) : item.path,
        code: b64ToUtf8(blob.content || ''),
      });
    }
  }
  if (files.length === 0) {
    throw new Error('No .luau/.lua files found on that branch.');
  }
  return files;
}
