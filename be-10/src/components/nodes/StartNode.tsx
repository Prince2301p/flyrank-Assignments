import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Sparkles } from 'lucide-react';
import { StartNodeData } from '@/types/workflow';

interface StartNodeProps {
  data: StartNodeData;
  selected?: boolean;
}

export const StartNode = memo(({ data, selected }: StartNodeProps) => {
  return (
    <div
      className={`relative min-w-[220px] rounded-xl bg-slate-900/90 border p-3 shadow-xl backdrop-blur-md transition-all duration-200 ${
        selected ? 'border-cyan-400 ring-2 ring-cyan-400/30' : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      <div className="flex items-center gap-2 mb-1 border-b border-slate-800 pb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          <Play className="w-4 h-4 fill-cyan-400/40" />
        </div>
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">Input Entry</span>
          <h3 className="text-sm font-bold text-slate-100">{data.label || 'Start Workflow'}</h3>
        </div>
      </div>
      
      {data.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
          {data.description}
        </p>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="w-3.5 h-3.5 !bg-cyan-400 !border-2 !border-slate-900 transition-transform hover:scale-125"
      />
    </div>
  );
});

StartNode.displayName = 'StartNode';
