// GitHubConnectModal — link a project to the user's own GitHub repo.
// Token is a classic PAT with `repo` scope, stored in localStorage on-device only.

import React, { useState } from 'react';
import { X, Github, KeyRound, Loader2, Unlink, ExternalLink } from 'lucide-react';
import {
  validateGitHubConfig,
  type GitHubConfig,
} from '../utils/githubSync';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  existing: GitHubConfig | null;
  onSave: (cfg: GitHubConfig) => void;
  onDisconnect: () => void;
}

export const GitHubConnectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projectName,
  existing,
  onSave,
  onDisconnect,
}) => {
  const [token, setToken] = useState(existing?.token || '');
  const [owner, setOwner] = useState(existing?.owner || '');
  const [repo, setRepo] = useState(existing?.repo || '');
  const [branch, setBranch] = useState(existing?.branch || 'main');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);
    const cfg: GitHubConfig = {
      token: token.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
      branch: branch.trim() || 'main',
    };
    if (!cfg.token || !cfg.owner || !cfg.repo) {
      setError('Fill in token, owner and repo name.');
      return;
    }
    setValidating(true);
    try {
      await validateGitHubConfig(cfg);
      onSave(cfg);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Could not connect. Check the token and repo details.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#12141c] border border-[#2b3044] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222738] bg-[#161924]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1a2033] border border-[#2a3350] flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Connect GitHub repo</h2>
              <p className="text-[11px] text-gray-400 truncate max-w-[220px]">"{projectName}" → your repo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252a3b] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Personal access token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_… (classic token, repo scope)"
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c12] border border-[#23283b] text-sm font-mono text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/60"
            />
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 mt-1.5"
            >
              Create a token on github.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Owner</label>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Pannu2009"
                autoComplete="off"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c12] border border-[#23283b] text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Repo</label>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="my-roblox-game"
                autoComplete="off"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c12] border border-[#23283b] text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">Branch</label>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c12] border border-[#23283b] text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {error && (
            <p className="text-xs text-red-300 bg-red-950/30 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <p className="text-[11px] text-gray-500 leading-relaxed">
            Your token is stored only on this device and used solely to sync this project with your
            repo. BloxCraft never sees it.
          </p>

          <button
            onClick={handleSave}
            disabled={validating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            {validating ? 'Verifying…' : existing ? 'Save & re-verify' : 'Connect & verify'}
          </button>

          {existing && (
            <button
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a2033] hover:bg-[#242c44] border border-red-500/30 text-red-300 text-sm font-bold transition-colors"
            >
              <Unlink className="w-4 h-4" />
              Disconnect repo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
