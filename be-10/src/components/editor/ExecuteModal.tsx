import React, { useState } from 'react';
import { X, Play, Sparkles, HelpCircle, MessageSquareText, ShieldAlert } from 'lucide-react';

interface ExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRun: (inputText: string) => void;
  userApiKey: string;
  onUpdateApiKey: (key: string) => void;
}

export const ExecuteModal: React.FC<ExecuteModalProps> = ({
  isOpen,
  onClose,
  onConfirmRun,
  userApiKey,
  onUpdateApiKey,
}) => {
  const [inputText, setInputText] = useState(
    'My account login fails with a 500 error when clicking submit. Can someone help fix this bug ASAP?'
  );
  const [keyInput, setKeyInput] = useState(userApiKey);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);

  if (!isOpen) return null;

  const sampleInputs = [
    {
      label: 'Technical Support Bug',
      text: 'My account login fails with a 500 error when clicking submit. Can someone help fix this bug ASAP?',
      icon: <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />,
    },
    {
      label: 'Sales Quote Request',
      text: 'We represent an enterprise with 500 seats looking to buy a license plan. Can you send pricing and demo info?',
      icon: <MessageSquareText className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      label: 'Spam Phishing Link',
      text: 'CONGRATS WINNER! Click http://crypto-free-prize.xyz to claim $10,000 cash prize instantly!',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput !== userApiKey) {
      onUpdateApiKey(keyInput);
    }
    onConfirmRun(inputText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Play className="w-4 h-4 fill-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Execute AI Decision Flow</h2>
              <p className="text-xs text-slate-400">Triggers Inngest step functions across visual graph nodes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sample Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Quick Sample Input Text:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {sampleInputs.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInputText(sample.text)}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-left text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  {sample.icon}
                  <span className="truncate">{sample.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Input Text Payload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Workflow Input Payload Text
            </label>
            <textarea
              rows={4}
              required
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
              placeholder="Enter customer message or prompt text to process through decision tree..."
            />
          </div>

          {/* Advanced LLM Configuration Accordion */}
          <div className="border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={() => setShowApiKeySettings(!showApiKeySettings)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showApiKeySettings ? 'Hide API Key Settings' : 'Configure Custom OpenAI API Key (Optional)'}</span>
            </button>

            {showApiKeySettings && (
              <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-mono text-slate-400">
                  OpenAI API Key (sk-...)
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white font-mono"
                  placeholder="Leave blank to use built-in smart heuristic engine"
                />
                <p className="text-[11px] text-slate-500">
                  If left empty, the application uses the built-in smart local heuristic engine for zero-friction testing.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/25 transition-all"
            >
              Start Workflow Execution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
