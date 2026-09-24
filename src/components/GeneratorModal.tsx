import React, { useState } from 'react';
import { X, Wand2, Sparkles, Folder, Check, FileCode, Layers, HelpCircle, Copy } from 'lucide-react';
import { ScriptType, GenerationResult } from '../types/roblox';
import { ROBLOX_TEMPLATES } from '../data/defaultScripts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddScript: (script: { name: string; type: ScriptType; code: string; suggestedPlacement: string }) => void;
}

export const GeneratorModal: React.FC<Props> = ({ isOpen, onClose, onAddScript }) => {
  const [prompt, setPrompt] = useState('');
  const [scriptType, setScriptType] = useState<ScriptType>('ModuleScript');
  const [architecture, setArchitecture] = useState('OOP');
  const [strictTyping, setStrictTyping] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [customReqs, setCustomReqs] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectTemplate = (template: typeof ROBLOX_TEMPLATES[0]) => {
    setPrompt(template.prompt);
    setScriptType(template.type);
    setArchitecture(template.architecture);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Please enter a description for the module or script you want to build.');
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);

    try {
      const res = await fetch('/api/roblox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          scriptType,
          architecture,
          strictTyping,
          includeComments,
          customRequirements: customReqs,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate Roblox script');
      }

      const data: GenerationResult = await res.json();
      setGenerationResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (!generationResult) return;
    const name = generationResult.title.endsWith('.luau')
      ? generationResult.title
      : `${generationResult.title}.luau`;

    onAddScript({
      name,
      type: generationResult.scriptType,
      code: generationResult.code,
      suggestedPlacement: generationResult.suggestedPlacement,
    });
    onClose();
  };

  const handleCopyCode = () => {
    if (generationResult?.code) {
      navigator.clipboard.writeText(generationResult.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12141c] border border-[#2b3044] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222738] bg-[#161924]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Roblox Luau Module & Script Generator
              </h2>
              <p className="text-xs text-gray-400">
                Generate production-grade OOP classes, network singletons, or controllers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252a3b] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!generationResult ? (
            <>
              {/* Quick Template Starters */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Popular Roblox Architectural Templates:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ROBLOX_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      className="p-2.5 rounded-xl bg-[#171a26] hover:bg-[#1e2333] border border-[#252b3d] hover:border-red-500/40 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-gray-200 group-hover:text-red-400 transition-colors">
                          {tmpl.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-gray-400 font-mono">
                          {tmpl.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-1">{tmpl.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Script Type & Architecture Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Script Type:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ModuleScript', 'ServerScript', 'LocalScript'] as ScriptType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setScriptType(type)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                          scriptType === type
                            ? type === 'ModuleScript'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : type === 'ServerScript'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-[#161a27] text-gray-400 border-[#242a3d] hover:text-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Architecture Style:
                  </label>
                  <select
                    value={architecture}
                    onChange={(e) => setArchitecture(e.target.value)}
                    className="w-full bg-[#161a27] border border-[#242a3d] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-red-500/50"
                  >
                    <option value="OOP">OOP Metatable Class (__index, new, destroy)</option>
                    <option value="Service">Service / Controller Singleton</option>
                    <option value="Knit">Knit Framework Style (OnInit, OnStart, Signals)</option>
                    <option value="Component">Component Pattern (CollectionService tag)</option>
                    <option value="DataStore">DataStore Manager (Session Locking, pcall)</option>
                    <option value="Utility">Pure Utility Functions Library</option>
                  </select>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Describe what your script or module should do:
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Create a Pet Follow controller that makes active pets float smoothly behind the player's character with spring lerping, obstacle avoidance, and idle bobbing animation."
                  className="w-full bg-[#0d0f17] border border-[#262c40] rounded-xl p-3 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 resize-none font-mono"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={strictTyping}
                    onChange={(e) => setStrictTyping(e.target.checked)}
                    className="rounded bg-[#1a1f2e] border-gray-700 text-red-600 focus:ring-0"
                  />
                  <span>Enforce Strict Luau Typing (<code className="text-purple-300 font-mono">--!strict</code>)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                    className="rounded bg-[#1a1f2e] border-gray-700 text-red-600 focus:ring-0"
                  />
                  <span>Include Detailed Roblox Studio Guide Comments</span>
                </label>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/40 text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}
            </>
          ) : (
            /* Generated Result Preview */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141824] border border-[#23293d] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{generationResult.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-900/40 text-purple-300 border border-purple-500/30">
                      {generationResult.scriptType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#202538] hover:bg-[#282f47] text-gray-200 rounded-lg text-xs transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => setGenerationResult(null)}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                    >
                      Modify Prompt
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-300">{generationResult.overview}</div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-[#242b3d] text-xs flex items-center justify-between">
                  <span className="text-gray-400">Suggested Explorer Location:</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    game.{generationResult.suggestedPlacement}
                  </span>
                </div>

                {/* Studio Setup Steps */}
                {generationResult.studioSetupSteps.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Roblox Studio Setup Steps:
                    </span>
                    <ul className="list-decimal pl-4 space-y-1 text-xs text-gray-300">
                      {generationResult.studioSetupSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Code Preview */}
              <div className="bg-[#0b0c10] border border-[#22273a] rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[350px]">
                <pre className="text-gray-300 whitespace-pre">{generationResult.code}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222738] bg-[#161924] flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Powered by Roblox Engine Best Practices & Gemini 3.8 Flash
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            {!generationResult ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-red-900/30 transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Generating Luau...' : 'Generate Script'}</span>
              </button>
            ) : (
              <button
                onClick={handleInsert}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-900/30 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Open in Studio Editor</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
