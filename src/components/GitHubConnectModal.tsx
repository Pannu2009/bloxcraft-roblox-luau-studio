// GitHubConnectModal — link a project to the user's own GitHub repo.
// Token is a classic PAT with `repo` scope, stored in localStorage on-device only.

import React, { useState, useRef, useEffect } from 'react';
import { X, Github, KeyRound, Loader2, Unlink, ExternalLink, Smartphone, Copy, Check } from 'lucide-react';
import {
  validateGitHubConfig,
  startDeviceFlow,
  pollDeviceToken,
  loadDeviceClientId,
  saveDeviceClientId,
  type GitHubConfig,
  type DeviceCodeResponse,
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
  // One-time device login (no manual token)
  const [mode, setMode] = useState<'device' | 'token'>(existing?.token ? 'token' : 'device');
  const [clientId, setClientId] = useState(loadDeviceClientId());
  const [device, setDevice] = useState<DeviceCodeResponse | null>(null);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const pollRef = useRef<{ stop: boolean }>({ stop: false });

  // Stop polling if the modal is closed mid-login
  useEffect(() => {
    if (!isOpen) {
      pollRef.current.stop = true;
      setDevice(null);
      setDeviceBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startLogin = async () => {
    if (!clientId.trim()) {
      setError('Paste your OAuth App Client ID first (one-time setup, see below).');
      return;
    }
    setError(null);
    setDeviceBusy(true);
    pollRef.current.stop = false;
    try {
      const info = await startDeviceFlow(clientId.trim());
      saveDeviceClientId(clientId.trim());
      setDevice(info);
      // Poll until approved / denied / expired / cancelled
      let wait = info.interval * 1000;
      const deadline = Date.now() + info.expiresIn * 1000;
      while (!pollRef.current.stop && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, wait));
        if (pollRef.current.stop) break;
        try {
          const accessToken = await pollDeviceToken(clientId.trim(), info.deviceCode);
          setToken(accessToken);
          setDevice(null);
          setError(null);
          break;
        } catch (e: any) {
          if (e.code === 'slow_down') wait += 5000;
          else if (e.code === 'access_denied') throw new Error('Login denied on GitHub. Try again.');
          else if (e.code === 'expired_token') throw new Error('Code expired — get a new one.');
          // authorization_pending: keep polling
        }
      }
      if (!pollRef.current.stop && !token) {
        // loop ended without token and without throw = timed out silently; keep waiting UI
      }
    } catch (e: any) {
      setError(e?.message || 'Device login failed. Check the Client ID.');
      setDevice(null);
    } finally {
      setDeviceBusy(false);
    }
  };

  const cancelLogin = () => {
    pollRef.current.stop = true;
    setDevice(null);
    setDeviceBusy(false);
  };

  const copyUserCode = async () => {
    if (!device) return;
    try {
      await navigator.clipboard.writeText(device.userCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {}
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm anim-fade-in">
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
          {/* Login mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0a0c12] border border-[#23283b]">
            <button
              onClick={() => setMode('device')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === 'device' ? 'bg-[#21273b] text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> 1-time login
            </button>
            <button
              onClick={() => setMode('token')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === 'token' ? 'bg-[#21273b] text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" /> Paste token
            </button>
          </div>

          {mode === 'device' ? (
            <div className="rounded-xl bg-[#0a0c12] border border-[#23283b] p-3.5 space-y-3">
              {device ? (
                <>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    <span className="font-bold text-white">Step 1:</span> copy this code,{' '}
                    <span className="font-bold text-white">Step 2:</span> approve it on GitHub.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2.5 rounded-lg bg-[#141824] border border-[#2a3350] text-xl font-mono font-bold text-zinc-300 tracking-[0.2em] text-center">
                      {device.userCode}
                    </code>
                    <button
                      onClick={copyUserCode}
                      className="p-2.5 rounded-lg bg-[#1a2033] hover:bg-[#242c44] text-gray-200"
                      title="Copy code"
                    >
                      {codeCopied ? <Check className="w-4 h-4 text-zinc-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <a
                    href={device.verificationUri}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white text-sm font-bold transition-colors"
                  >
                    Open GitHub to approve <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                    Waiting for your approval on GitHub…
                  </div>
                  <button onClick={cancelLogin} className="w-full text-[11px] text-gray-500 hover:text-gray-300 underline underline-offset-2">
                    Cancel
                  </button>
                </>
              ) : token && mode === 'device' ? (
                <p className="text-xs text-zinc-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Logged in with GitHub — now fill in the repo details below.
                </p>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                      OAuth App Client ID <span className="text-gray-500 font-normal">(one-time setup)</span>
                    </label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Ov23ct…"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#141824] border border-[#2a3350] text-sm font-mono text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-zinc-500/60"
                    />
                  </div>
                  <button
                    onClick={startLogin}
                    disabled={deviceBusy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white text-sm font-bold disabled:opacity-50 transition-colors"
                  >
                    {deviceBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                    {deviceBusy ? 'Working…' : 'Get login code'}
                  </button>
                  <details className="text-[11px] text-gray-500 leading-relaxed">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-200 font-semibold">
                      How to get a Client ID (2 min, once ever)
                    </summary>
                    <ol className="list-decimal list-inside mt-1.5 space-y-1">
                      <li>On github.com go to <span className="text-gray-300">Settings → Developer settings → OAuth Apps → New OAuth App</span>.</li>
                      <li>Any name works; Homepage URL can be <span className="text-gray-300">https://github.com</span>; skip callback URL.</li>
                      <li>Copy the <span className="text-gray-300">Client ID</span> and paste it above. No secret needed.</li>
                    </ol>
                  </details>
                </>
              )}
            </div>
          ) : (
          <div>
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-1.5">
              <KeyRound className="w-3.5 h-3.5 text-zinc-400" /> Personal access token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_… (classic token, repo scope)"
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c12] border border-[#23283b] text-sm font-mono text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-zinc-500/60"
            />
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-zinc-200 mt-1.5"
            >
              Create a token on github.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Owner</label>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Pannu2009"
                autoComplete="off"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c12] border border-[#23283b] text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-zinc-500/60"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">Repo</label>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="my-roblox-game"
                autoComplete="off"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c12] border border-[#23283b] text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-zinc-500/60"
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
              className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c12] border border-[#23283b] text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-zinc-500/60"
            />
          </div>

          {error && (
            <p className="text-xs text-zinc-300 bg-zinc-950/30 border border-zinc-500/30 rounded-xl px-3 py-2">
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
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white text-sm font-bold disabled:opacity-50 transition-colors"
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a2033] hover:bg-[#242c44] border border-zinc-500/30 text-zinc-300 text-sm font-bold transition-colors"
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
