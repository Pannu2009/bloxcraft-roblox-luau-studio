// UstaadApplyModal — paste a project bundle Ustaad sent back in chat and
// apply its file updates/creations to the active project.

import React, { useState } from 'react';
import { X, ClipboardPaste, Check, FileCode, FilePlus2, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  parseProjectBundle,
  bundleMatchesThisApp,
  type ParsedBundle,
  type BundleFile,
} from '../utils/museLink';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  existingFiles: Array<{ folder?: string; name: string }>;
  onApply: (files: BundleFile[]) => void;
}

export const UstaadApplyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projectName,
  existingFiles,
  onApply,
}) => {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    setError(null);
    try {
      const b = parseProjectBundle(text);
      if (b.files.length === 0) {
        setError('No files found — paste the full bundle Ustaad sent (it has "### FILE:" sections).');
        setParsed(null);
        return;
      }
      setParsed(b);
    } catch (e: any) {
      setError(e?.message || 'Could not read that bundle.');
      setParsed(null);
    }
  };

  const handleApply = () => {
    if (!parsed) return;
    onApply(parsed.files);
    setText('');
    setParsed(null);
    onClose();
  };

  const isUpdate = (f: BundleFile) =>
    existingFiles.some((e) => (e.folder || 'src') === f.folder && e.name === f.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#12141c] border border-[#2b3044] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222738] bg-[#161924]">
          <div>
            <h2 className="text-base font-bold text-white">Apply Ustaad's edits</h2>
            <p className="text-[11px] text-gray-400">
              Paste the bundle from chat — matching files update, new ones are created.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252a3b] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {!parsed ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'Paste the bundle here…\n\n# BloxCraft project bundle\n# Project: …\n### FILE: src/server/Main.luau [ServerScript]\n```luau\n…'}
                className="w-full h-48 p-3 rounded-xl bg-[#0a0c12] border border-[#23283b] text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 resize-y"
              />
              {error && <p className="text-xs text-red-300">{error}</p>}
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-40 transition-colors"
              >
                <ClipboardPaste className="w-4 h-4" />
                Read bundle
              </button>
            </>
          ) : (
            <>
              <div
                className={`flex items-start gap-2 p-3 rounded-xl border text-[11px] ${
                  bundleMatchesThisApp(parsed)
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                }`}
              >
                {bundleMatchesThisApp(parsed) ? (
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>
                  {bundleMatchesThisApp(parsed)
                    ? `Verified — this bundle is paired to this app (${parsed.pairingCode}).`
                    : parsed.pairingCode
                    ? `Pairing code ${parsed.pairingCode} doesn't match this install. Only apply if you trust the sender.`
                    : 'No pairing code in this bundle. Only apply if you trust the sender.'}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {parsed.files.length} file{parsed.files.length === 1 ? '' : 's'} → "{projectName}"
                </div>
                {parsed.files.map((f, i) => {
                  const update = isUpdate(f);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a0c12] border border-[#1e2336]"
                    >
                      {update ? (
                        <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <FilePlus2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span className="text-xs font-mono text-gray-200 truncate flex-1">
                        {f.folder}/{f.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          update ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {update ? 'UPDATE' : 'NEW'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setParsed(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a2033] hover:bg-[#242c44] text-gray-200 text-sm font-bold transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Apply to project
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
