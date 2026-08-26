import React, { useState } from 'react';
import { Terminal, CheckCircle2, XCircle, Clock, ChevronUp, ChevronDown, ListFilter, Cpu, Copy, Check } from 'lucide-react';
import { ExecutionLog, WorkflowExecutionState } from '@/types/workflow';

interface LogsPanelProps {
  executionState: WorkflowExecutionState | null;
  history: WorkflowExecutionState[];
  onClearLogs: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({
  executionState,
  history,
  onClearLogs,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'history' | 'inngest'>('timeline');
  const [copied, setCopied] = useState(false);

  const logs = executionState?.logs || [];
  const status = executionState?.status || 'idle';

  const handleCopyJSON = () => {
    if (executionState) {
      navigator.clipboard.writeText(JSON.stringify(executionState, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 transition-all duration-300 z-20 backdrop-blur-xl shadow-2xl ${
      isExpanded ? 'h-64' : 'h-10'
    }`}>
      {/* Panel Header */}
      <div className="h-10 px-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-200">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Workflow Execution Logs</span>
            {status === 'running' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
            )}
          </div>

          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => { setIsExpanded(true); setActiveTab('timeline'); }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                activeTab === 'timeline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Timeline ({logs.length})
            </button>

            <button
              onClick={() => { setIsExpanded(true); setActiveTab('history'); }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              History ({history.length})
            </button>

            <button
              onClick={() => { setIsExpanded(true); setActiveTab('inngest'); }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                activeTab === 'inngest' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Inngest Trace
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {executionState && (
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Total Duration: {executionState.totalLatencyMs}ms
            </span>
          )}

          <button
            onClick={handleCopyJSON}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            title="Copy Execution JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Panel Body */}
      {isExpanded && (
        <div className="p-3 h-[calc(100%-2.5rem)] overflow-y-auto font-mono text-xs text-slate-300">
          {activeTab === 'timeline' && (
            logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs">
                No active execution steps yet. Click &quot;Run Workflow&quot; in the top bar to trigger Inngest execution.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {log.decision === 'YES' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {log.decision === 'NO' && <XCircle className="w-4 h-4 text-rose-400" />}
                        {log.decision === 'ACTION' && <Cpu className="w-4 h-4 text-amber-400" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{log.nodeLabel}</span>
                          <span className="text-[10px] text-slate-500">Step #{log.stepNumber}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            log.decision === 'YES' ? 'bg-emerald-500/20 text-emerald-400' :
                            log.decision === 'NO' ? 'bg-rose-500/20 text-rose-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {log.decision}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">&quot;{log.prompt}&quot;</p>
                        <p className="text-slate-300 text-[11px] mt-1 italic">{log.reasoning}</p>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 flex sm:flex-col items-center sm:items-end justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {log.latencyMs}ms
                      </span>
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'history' && (
            history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs">
                No past run history recorded in this session.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <div key={item.runId || idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        <span>Run #{history.length - idx}</span>
                        <span className="text-[10px] font-mono text-slate-500">({item.runId})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 font-sans">
                        Input: &quot;{item.initialInput}&quot;
                      </p>
                    </div>
                    <div className="text-right text-[11px] font-mono text-slate-400">
                      <div>Steps: {item.logs.length}</div>
                      <div>Duration: {item.totalLatencyMs}ms</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'inngest' && (
            <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-indigo-300 overflow-x-auto border border-slate-800">
              {JSON.stringify(
                {
                  inngestEvent: "workflow/execute",
                  client: "ai-decision-flow",
                  activeState: executionState,
                },
                null,
                2
              )}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
