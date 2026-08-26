import React, { useRef } from 'react';
import {
  Play,
  Plus,
  RotateCcw,
  Download,
  Upload,
  Layers,
  Sparkles,
  Key,
  Trash2,
  Cpu
} from 'lucide-react';
import { PRESET_TEMPLATES } from '@/lib/templates';
import { WorkflowTemplate } from '@/types/workflow';

interface HeaderToolbarProps {
  onLoadTemplate: (template: WorkflowTemplate) => void;
  onAddNode: (type: 'start' | 'aiDecision' | 'action') => void;
  onRunWorkflow: () => void;
  onResetState: () => void;
  onClearCanvas: () => void;
  onExportJSON: () => void;
  onImportJSON: (jsonString: string) => void;
  onOpenApiKeyModal: () => void;
  isExecuting: boolean;
  hasApiKey: boolean;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  onLoadTemplate,
  onAddNode,
  onRunWorkflow,
  onResetState,
  onClearCanvas,
  onExportJSON,
  onImportJSON,
  onOpenApiKeyModal,
  isExecuting,
  hasApiKey,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onImportJSON(content);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="h-16 bg-slate-950/90 border-b border-slate-800 px-4 flex items-center justify-between backdrop-blur-lg z-20 sticky top-0 shadow-xl select-none">
      {/* Brand & Preset Dropdown */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              AI Decision Flow
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Inngest Driven
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">React Flow + Binary LLM Decision Engine</p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 hidden md:block" />

        {/* Template Selector */}
        <div className="relative hidden md:flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <select
            onChange={(e) => {
              const tmpl = PRESET_TEMPLATES.find((t) => t.id === e.target.value);
              if (tmpl) onLoadTemplate(tmpl);
            }}
            className="bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            {PRESET_TEMPLATES.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                Template: {tmpl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Nodes & Canvas Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
          <button
            onClick={() => onAddNode('aiDecision')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
            title="Add AI YES/NO Decision Node"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>AI Decision Node</span>
          </button>

          <button
            onClick={() => onAddNode('action')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
            title="Add Terminal Action Node"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Action Node</span>
          </button>
        </div>

        <div className="h-6 w-px bg-slate-800" />

        {/* API Key Modal Trigger */}
        <button
          onClick={onOpenApiKeyModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            hasApiKey
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
          }`}
          title="Configure OpenAI API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasApiKey ? 'API Key Active' : 'LLM Mode (Default/Custom)'}</span>
        </button>

        {/* Export / Import JSON */}
        <div className="flex items-center gap-1">
          <button
            onClick={onExportJSON}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
            title="Export Workflow JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
            title="Import Workflow JSON"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={onResetState}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
            title="Reset Workflow Execution State"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onClearCanvas}
            className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 text-xs transition-colors"
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* RUN WORKFLOW BUTTON */}
        <button
          onClick={onRunWorkflow}
          disabled={isExecuting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all ${
            isExecuting
              ? 'bg-purple-600/50 cursor-wait opacity-80'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-95'
          }`}
        >
          <Play className={`w-4 h-4 ${isExecuting ? 'animate-spin' : 'fill-white'}`} />
          <span>{isExecuting ? 'Executing Inngest Flow...' : 'Run Workflow'}</span>
        </button>
      </div>
    </header>
  );
};
