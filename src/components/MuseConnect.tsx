// MuseConnect — the in-app integration card for the user's Muse assistant.
// Shows the install pairing code and lets the user share the active project
// as a text bundle (via the OS share sheet) straight into Muse chat.

import React, { useState } from 'react';
import { Bot, Copy, Check, Share2, Link2, Unlink, ShieldCheck, ClipboardPaste } from 'lucide-react';
import type { RobloxProject } from '../types/roblox';
import {
  getPairingCode,
  isIntroduced,
  setIntroduced,
  shareProjectBundle,
  shareProjectBundleAsFile,
  type BundleFile,
} from '../utils/museLink';
import { UstaadApplyModal } from './UstaadApplyModal';

interface Props {
  project: RobloxProject;
  onApplyBundle: (files: BundleFile[]) => void;
}

export const MuseConnect: React.FC<Props> = ({ project, onApplyBundle }) => {
  const [code] = useState(getPairingCode);
  const [introduced, setIntroducedState] = useState(isIntroduced());
  const [copied, setCopied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'working' | 'shared' | 'downloaded' | 'copied' | 'failed'>('idle');

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Primary: share the bundle as a .txt file (never touches the clipboard)
  const onShare = async () => {
    setShareState('working');
    const outcome = await shareProjectBundleAsFile(project);
    setShareState(outcome === 'shared' ? 'shared' : outcome === 'downloaded' ? 'downloaded' : 'failed');
    setTimeout(() => setShareState('idle'), 5000);
  };

  // Fallback: copy the bundle text (for chat apps that can't take a file)
  const onCopyText = async () => {
    setShareState('working');
    const outcome = await shareProjectBundle(project);
    setShareState(outcome === 'shared' ? 'shared' : outcome === 'copied' ? 'copied' : 'failed');
    setTimeout(() => setShareState('idle'), 5000);
  };

  const toggleIntroduced = () => {
    const next = !introduced;
    setIntroduced(next);
    setIntroducedState(next);
  };

  return (
    <div className="p-3 rounded-xl bg-[#121520] border border-[#2a3350] space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white">Muse Assistant</div>
          <div className="text-[10px] text-gray-400">Ustaad · your personal AI builder</div>
        </div>
        <span
          className={`ml-auto shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            introduced
              ? 'bg-zinc-500/15 border-zinc-500/40 text-zinc-300'
              : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-300'
          }`}
        >
          {introduced ? 'Linked' : 'Not linked'}
        </span>
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Connect this app to Ustaad so you can send him your projects straight from here.
      </p>

      {/* pairing code */}
      <div>
        <div className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">
          Your pairing code
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0a0c12] border border-[#23283b] text-sm font-mono font-bold text-zinc-300 tracking-widest text-center">
            {code}
          </code>
          <button
            onClick={copyCode}
            className="p-2 rounded-lg bg-[#1a2033] hover:bg-[#242c44] text-gray-200 transition-colors"
            title="Copy pairing code"
          >
            {copied ? <Check className="w-4 h-4 text-zinc-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
          Send this code to Ustaad in chat once. Every project you share afterwards carries it,
          so he knows it's really from you.
        </p>
      </div>

      <button
        onClick={toggleIntroduced}
        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
          introduced
            ? 'bg-[#1a2033] border-[#2a3350] text-gray-300 hover:bg-[#222a40]'
            : 'bg-zinc-600/25 border-zinc-500/40 text-zinc-200 hover:bg-zinc-600/40'
        }`}
      >
        {introduced ? <Unlink className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
        {introduced ? "Unlink (code was reset / changed)" : "I've sent my code to Ustaad"}
      </button>

      {/* share */}
      <div className="pt-1 border-t border-[#1e2336]">
        <div className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide mt-2">
          Share "{project.name}" ({project.files.length} files)
        </div>
        <button
          onClick={onShare}
          disabled={shareState === 'working'}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-600/25 border border-zinc-500/40 text-zinc-200 text-xs font-bold hover:bg-zinc-600/40 disabled:opacity-50 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          {shareState === 'working' ? 'Preparing…' : 'Send project to Ustaad'}
        </button>
        <button
          onClick={onCopyText}
          disabled={shareState === 'working'}
          className="w-full mt-1.5 text-[10px] text-gray-500 hover:text-gray-300 underline underline-offset-2 disabled:opacity-50"
        >
          or copy the bundle text instead
        </button>
        <button
          onClick={() => setApplyOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-xl bg-zinc-600/25 border border-zinc-500/40 text-zinc-200 text-xs font-bold hover:bg-zinc-600/40 transition-colors"
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          Apply Ustaad's edits
        </button>
        {shareState === 'shared' && (
          <p className="text-[10px] text-zinc-300 mt-1.5 flex items-center gap-1">
            <Check className="w-3 h-3" /> Shared as a file — pick Muse in the share sheet and send the .txt.
          </p>
        )}
        {shareState === 'downloaded' && (
          <p className="text-[10px] text-zinc-300 mt-1.5">
            Share sheet unavailable — the bundle downloaded as a .txt file. Attach it to Ustaad in chat.
          </p>
        )}
        {shareState === 'copied' && (
          <p className="text-[10px] text-zinc-300 mt-1.5">
            Share sheet unavailable — bundle copied to clipboard. Paste it to Ustaad in chat.
          </p>
        )}
        {shareState === 'failed' && (
          <p className="text-[10px] text-zinc-300 mt-1.5">
            Couldn't share or copy. Try again, or use Export ZIP.
          </p>
        )}
        <p className="text-[10px] text-gray-500 mt-1.5 flex items-start gap-1 leading-relaxed">
          <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5 text-gray-500" />
          The bundle includes your pairing code and stays on your device until you share it.
        </p>
      </div>

      <UstaadApplyModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        projectName={project.name}
        existingFiles={project.files}
        onApply={onApplyBundle}
      />
    </div>
  );
};
