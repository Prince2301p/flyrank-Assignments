import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle, Zap, AlertTriangle, MessageSquare, ShieldAlert } from 'lucide-react';
import { ActionNodeData } from '@/types/workflow';

interface ActionNodeProps {
  data: ActionNodeData;
  selected?: boolean;
}

export const ActionNode = memo(({ data, selected }: ActionNodeProps) => {
  const status = data.status || 'idle';

  let icon = <Zap className="w-4 h-4 text-amber-400" />;
  if (data.actionType === 'alert') icon = <ShieldAlert className="w-4 h-4 text-red-400" />;
  if (data.actionType === 'ticket') icon = <AlertTriangle className="w-4 h-4 text-orange-400" />;
  if (data.actionType === 'bot') icon = <MessageSquare className="w-4 h-4 text-blue-400" />;

  let borderClass = 'border-slate-700 hover:border-slate-500';
  if (status === 'passed_yes' || status === 'passed_no') {
    borderClass = 'border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/20';
  }

  return (
    <div
      className={`relative min-w-[220px] max-w-[260px] rounded-xl bg-slate-900/90 border p-3 shadow-xl backdrop-blur-md transition-all duration-200 ${borderClass} ${
        selected ? 'ring-2 ring-amber-400' : ''
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="w-3.5 h-3.5 !bg-amber-400 !border-2 !border-slate-900 transition-transform hover:scale-125"
      />

      <div className="flex items-center gap-2 mb-1.5 border-b border-slate-800 pb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30">
          {icon}
        </div>
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Terminal Action</span>
          <h3 className="text-sm font-bold text-slate-100">{data.label || 'Execute Action'}</h3>
        </div>
      </div>

      {data.actionDetails && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
          {data.actionDetails}
        </p>
      )}

      {status !== 'idle' && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
          <CheckCircle className="w-3 h-3 text-amber-400" />
          <span>Workflow Completed</span>
        </div>
      )}
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
