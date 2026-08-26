"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { HeaderToolbar } from "@/components/editor/HeaderToolbar";
import { FlowCanvas } from "@/components/editor/FlowCanvas";
import { NodeInspector } from "@/components/editor/NodeInspector";
import { LogsPanel } from "@/components/editor/LogsPanel";
import { ExecuteModal } from "@/components/editor/ExecuteModal";
import { PRESET_TEMPLATES } from "@/lib/templates";
import { WorkflowExecutionState, WorkflowTemplate, ExecutionLog } from "@/types/workflow";
import { generateId } from "@/lib/utils";

export default function WorkflowPage() {
  const [nodes, setNodes] = useState<Node[]>(PRESET_TEMPLATES[0].nodes);
  const [edges, setEdges] = useState<Edge[]>(PRESET_TEMPLATES[0].edges);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [executionState, setExecutionState] = useState<WorkflowExecutionState | null>(null);
  const [history, setHistory] = useState<WorkflowExecutionState[]>([]);

  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");

  // Keep selected node synced if nodes array mutates
  useEffect(() => {
    if (selectedNode) {
      const updated = nodes.find((n) => n.id === selectedNode.id);
      if (updated) setSelectedNode(updated);
    }
  }, [nodes, selectedNode]);

  // Load a preset template
  const handleLoadTemplate = (template: WorkflowTemplate) => {
    setNodes(template.nodes);
    setEdges(template.edges);
    setSelectedNode(null);
    setExecutionState(null);
  };

  // Add new nodes dynamically
  const handleAddNode = (type: "start" | "aiDecision" | "action") => {
    const id = generateId(type);
    const position = {
      x: 250 + (nodes.length % 3) * 60,
      y: 200 + (nodes.length % 3) * 60,
    };

    let newNode: Node;

    if (type === "aiDecision") {
      newNode = {
        id,
        type: "aiDecision",
        position,
        data: {
          label: "New Decision Step",
          prompt: "Does the input meet criteria?",
          status: "idle",
        },
      };
    } else if (type === "action") {
      newNode = {
        id,
        type: "action",
        position,
        data: {
          label: "New Action Step",
          actionDetails: "Automated Workflow Response",
          status: "idle",
        },
      };
    } else {
      newNode = {
        id,
        type: "start",
        position,
        data: {
          label: "Start Workflow Input",
          description: "Incoming payload entry point",
        },
      };
    }

    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
  };

  // Update node data fields from Inspector
  const handleUpdateNodeData = (nodeId: string, newData: Record<string, any>) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      })
    );
  };

  // Delete node and its connected edges
  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  // Reset visual execution status on all nodes
  const handleResetState = () => {
    setExecutionState(null);
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: "idle",
          decision: null,
          reasoning: undefined,
          executionTimeMs: undefined,
        },
      }))
    );
    setEdges((prev) => prev.map((e) => ({ ...e, animated: false })));
  };

  // Clear canvas
  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setExecutionState(null);
  };

  // Export graph to JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-decision-workflow-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import graph from JSON
  const handleImportJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.nodes && parsed.edges) {
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        setSelectedNode(null);
        setExecutionState(null);
      }
    } catch (e) {
      alert("Invalid workflow JSON file format.");
    }
  };

  // Run Workflow via Inngest Execution API
  const handleRunWorkflow = async (inputText: string) => {
    setIsExecuting(true);
    handleResetState();

    const runId = `run_${Date.now()}`;
    const startNode = nodes.find((n) => n.type === "start") || nodes[0];

    const initialExecState: WorkflowExecutionState = {
      runId,
      status: "running",
      initialInput: inputText,
      currentNodeId: startNode?.id,
      executionPath: startNode ? [startNode.id] : [],
      logs: [],
      totalLatencyMs: 0,
    };

    setExecutionState(initialExecState);

    try {
      // Call Inngest execution backend API
      const res = await fetch("/api/workflow/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          initialInput: inputText,
          nodes,
          edges,
          apiKey: userApiKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Workflow execution failed.");
      }

      // Step-by-step visual playback sequence for smooth DX
      const { executionPath, logs } = data;
      const accumulatedLogs: ExecutionLog[] = [];
      let totalLatency = 0;

      for (let i = 0; i < logs.length; i++) {
        const logItem = logs[i];
        accumulatedLogs.push(logItem);
        totalLatency += logItem.latencyMs || 250;

        setExecutionState({
          runId,
          status: i === logs.length - 1 ? "completed" : "running",
          initialInput: inputText,
          currentNodeId: logItem.nodeId,
          executionPath: executionPath.slice(0, i + 2),
          logs: [...accumulatedLogs],
          totalLatencyMs: totalLatency,
        });

        // Delay step for visual particle flow
        await new Promise((r) => setTimeout(r, 450));
      }

      const finalState: WorkflowExecutionState = {
        runId,
        status: "completed",
        initialInput: inputText,
        currentNodeId: undefined,
        executionPath,
        logs: accumulatedLogs,
        totalLatencyMs: totalLatency,
      };

      setExecutionState(finalState);
      setHistory((prev) => [finalState, ...prev]);
    } catch (err: any) {
      console.error("Execution error:", err);
      setExecutionState((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              error: err.message,
            }
          : null
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Header Bar */}
      <HeaderToolbar
        onLoadTemplate={handleLoadTemplate}
        onAddNode={handleAddNode}
        onRunWorkflow={() => setIsExecuteModalOpen(true)}
        onResetState={handleResetState}
        onClearCanvas={handleClearCanvas}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onOpenApiKeyModal={() => setIsExecuteModalOpen(true)}
        isExecuting={isExecuting}
        hasApiKey={!!userApiKey}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* React Flow Canvas */}
        <div className="flex-1 h-full">
          <FlowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodeSelect={(node) => setSelectedNode(node)}
            onGraphChange={(newNodes, newEdges) => {
              setNodes(newNodes);
              setEdges(newEdges);
            }}
            executionState={executionState}
          />
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <NodeInspector
            selectedNode={selectedNode}
            onUpdateNodeData={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
            userApiKey={userApiKey}
          />
        )}
      </div>

      {/* Real-time Execution Logs Panel */}
      <LogsPanel
        executionState={executionState}
        history={history}
        onClearLogs={() => setHistory([])}
      />

      {/* Workflow Run / Trigger Modal */}
      <ExecuteModal
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        onConfirmRun={handleRunWorkflow}
        userApiKey={userApiKey}
        onUpdateApiKey={(key) => setUserApiKey(key)}
      />
    </div>
  );
}
