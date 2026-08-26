import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, CheckCircle2, XCircle, Loader2, HelpCircle } from 'lucide-react';
import { AIDecisionNodeData } from '@/types/workflow';

interface AIDecisionNodeProps {
  data: AIDecisionNodeData;
  selected?: boolean;
}

export const AIDecisionNode = memo(({ data, selected }: AIDecisionNodeProps) => {
  const status = data.status || 'idle';
  const decision = data.decision;

  let containerBorderClass = 'border-slate-700 hover:border-slate-500';
  let badgeColorClass = 'bg-slate-800 text-slate-400 border-slate-700';

  if (status === 'running') {
    containerBorderClass = 'border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/20 animate-pulse';
  } else if (status === 'passed_yes' || decision === 'YES') {
    containerBorderClass = 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20 animate-glow-yes';
    badgeColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (status === 'passed_no' || decision === 'NO') {
    containerBorderClass = 'border-rose-500 ring-2 ring-rose-500/30 shadow-lg shadow-rose-500/20 animate-glow-no';
    badgeColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  } else if (status === 'failed') {
    containerBorderClass = 'border-red-600 ring-2 ring-red-600/40';
    badgeColorClass = 'bg-red-500/20 text-red-400 border-red-500/40';
  }

  return (
    <div
      className={`relative min-w-[260px] max-w-[300px] rounded-xl bg-slate-900/95 border p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 ${containerBorderClass} ${
        selected ? 'ring-2 ring-indigo-400' : ''
      }`}
    >
      {/* Input Handle (Top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="w-3.5 h-3.5 !bg-indigo-400 !border-2 !border-slate-900 transition-transform hover:scale-125"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">AI Decision Step</span>
            <h3 className="text-sm font-bold text-slate-100 leading-tight">{data.label}</h3>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${badgeColorClass}`}>
          {status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
          {decision === 'YES' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          {decision === 'NO' && <XCircle className="w-3 h-3 text-rose-400" />}
          {status === 'idle' && <HelpCircle className="w-3 h-3 text-slate-400" />}
          <span>{status === 'running' ? 'Evaluating' : (decision || 'Ready')}</span>
        </div>
      </div>

      {/* Prompt Preview */}
      <div className="rounded-lg bg-slate-950/80 p-2 border border-slate-800/80 mb-2">
        <p className="text-xs text-slate-300 font-mono italic line-clamp-2">
          &quot;{data.prompt}&quot;
        </p>
      </div>

      {/* Reasoning Output if evaluated */}
      {data.reasoning && (
        <div className="text-[11px] text-slate-400 bg-slate-800/50 p-2 rounded border border-slate-700/50 mb-1">
          <span className="font-semibold text-slate-300">LLM Reasoning: </span>
          {data.reasoning}
        </div>
      )}

      {/* Latency footer */}
      {data.executionTimeMs && (
        <div className="flex items-center justify-end text-[10px] text-slate-500 font-mono">
          <span>Latency: {data.executionTimeMs}ms</span>
        </div>
      )}

      {/* Dual Branch Output Handles (YES / NO) */}
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800/60 text-[11px] font-bold">
        {/* YES Output Handle (Left) */}
        <div className="relative flex items-center gap-1 text-emerald-400 pl-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>YES Path</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: '25%' }}
            className="w-4 h-4 !bg-emerald-500 !border-2 !border-slate-900 transition-transform hover:scale-125 shadow-md shadow-emerald-500/50"
          />
        </div>

        {/* NO Output Handle (Right) */}
        <div className="relative flex items-center gap-1 text-rose-400 pr-1">
          <span>NO Path</span>
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: '75%' }}
            className="w-4 h-4 !bg-rose-500 !border-2 !border-slate-900 transition-transform hover:scale-125 shadow-md shadow-rose-500/50"
          />
        </div>
      </div>
    </div>
  );
});

AIDecisionNode.displayName = 'AIDecisionNode';
