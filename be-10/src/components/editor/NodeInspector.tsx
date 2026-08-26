import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { X, Bot, Play, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { evaluateDecisionNode } from '@/lib/llm';

interface NodeInspectorProps {
  selectedNode: Node | null;
  onUpdateNodeData: (nodeId: string, newData: Record<string, any>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
  userApiKey?: string;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  selectedNode,
  onUpdateNodeData,
  onDeleteNode,
  onClose,
  userApiKey,
}) => {
  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [systemContext, setSystemContext] = useState('');
  const [actionDetails, setActionDetails] = useState('');
  
  // Single node live test playground state
  const [testInput, setTestInput] = useState('My account is broken and throwing a 500 error when I login.');
  const [testResult, setTestResult] = useState<{ decision: 'YES' | 'NO'; reasoning: string; latencyMs: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (selectedNode) {
      setLabel(String(selectedNode.data?.label || ''));
      setPrompt(String(selectedNode.data?.prompt || ''));
      setSystemContext(String(selectedNode.data?.systemContext || ''));
      setActionDetails(String(selectedNode.data?.actionDetails || ''));
      setTestResult(null);
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const nodeType = selectedNode.type;

  const handleSave = () => {
    onUpdateNodeData(selectedNode.id, {
      label,
      prompt,
      systemContext,
      actionDetails,
    });
  };

  const handleTestNode = async () => {
    setIsTesting(true);
    try {
      const res = await evaluateDecisionNode(
        testInput,
        prompt || 'Is this valid?',
        systemContext,
        userApiKey
      );
      setTestResult(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="w-80 sm:w-96 bg-slate-900/95 border-l border-slate-800 h-[calc(100vh-4rem)] flex flex-col backdrop-blur-xl shadow-2xl z-30 select-none overflow-y-auto">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Node Inspector</h2>
            <span className="text-[10px] font-mono text-slate-400">ID: {selectedNode.id} ({nodeType})</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Node Label */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Node Label / Title
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              onUpdateNodeData(selectedNode.id, { label: e.target.value });
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Is Technical Support Request?"
          />
        </div>

        {/* AI Decision Node Specific Inputs */}
        {nodeType === 'aiDecision' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Decision Prompt / Criteria</span>
                <span className="text-[10px] text-indigo-400 font-normal">Strict YES / NO model criteria</span>
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  onUpdateNodeData(selectedNode.id, { prompt: e.target.value });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ask a question that can be answered strictly with YES or NO..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                System Context / Guidelines (Optional)
              </label>
              <textarea
                rows={2}
                value={systemContext}
                onChange={(e) => {
                  setSystemContext(e.target.value);
                  onUpdateNodeData(selectedNode.id, { systemContext: e.target.value });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Additional guardrails or domain definitions..."
              />
            </div>

            {/* Live Node Test Sandbox */}
            <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-3 space-y-2">
              <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                <Play className="w-3 h-3 fill-indigo-400" />
                <span>Test Node Prompt Isolation</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Test how the model responds to this individual node prompt in real time.
              </p>
              <textarea
                rows={2}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200"
                placeholder="Sample input text..."
              />
              <button
                onClick={handleTestNode}
                disabled={isTesting}
                className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                <span>{isTesting ? 'Evaluating Prompt...' : 'Run Single Node Test'}</span>
              </button>

              {testResult && (
                <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                  testResult.decision === 'YES'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>Decision Result: {testResult.decision}</span>
                    <span className="font-mono text-[10px] text-slate-400">{testResult.latencyMs}ms</span>
                  </div>
                  <p className="text-[11px] opacity-90">{testResult.reasoning}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Node Inputs */}
        {nodeType === 'action' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Action Description / Details
            </label>
            <input
              type="text"
              value={actionDetails}
              onChange={(e) => {
                setActionDetails(e.target.value);
                onUpdateNodeData(selectedNode.id, { actionDetails: e.target.value });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g. Escalate to Support Desk"
            />
          </div>
        )}
      </div>

      {/* Drawer Footer / Delete */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center">
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Node</span>
        </button>

        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
