import React, { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StartNode } from '../nodes/StartNode';
import { AIDecisionNode } from '../nodes/AIDecisionNode';
import { ActionNode } from '../nodes/ActionNode';
import { CustomDecisionEdge } from '../edges/CustomDecisionEdge';
import { WorkflowExecutionState } from '@/types/workflow';

const nodeTypes = {
  start: StartNode,
  aiDecision: AIDecisionNode,
  action: ActionNode,
};

const edgeTypes = {
  decision: CustomDecisionEdge,
};

interface FlowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodeSelect: (node: Node | null) => void;
  onGraphChange: (nodes: Node[], edges: Edge[]) => void;
  executionState: WorkflowExecutionState | null;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  initialNodes,
  initialEdges,
  onNodeSelect,
  onGraphChange,
  executionState,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external changes (e.g. loading templates or json import)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Sync graph state back to parent
  useEffect(() => {
    onGraphChange(nodes, edges);
  }, [nodes, edges, onGraphChange]);

  // Visual execution state animator effect
  useEffect(() => {
    if (!executionState) return;

    const path = executionState.executionPath || [];
    const logs = executionState.logs || [];

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        const logForNode = logs.find((l) => l.nodeId === node.id);
        const isCurrent = executionState.currentNodeId === node.id;
        const isVisited = path.includes(node.id);

        let status = node.data?.status || 'idle';
        let decision = node.data?.decision;
        let reasoning = node.data?.reasoning;
        let executionTimeMs = node.data?.executionTimeMs;

        if (isCurrent && executionState.status === 'running') {
          status = 'running';
        } else if (logForNode) {
          status = logForNode.decision === 'YES' ? 'passed_yes' : 'passed_no';
          decision = logForNode.decision;
          reasoning = logForNode.reasoning;
          executionTimeMs = logForNode.latencyMs;
        } else if (isVisited) {
          status = 'passed_yes';
        }

        return {
          ...node,
          data: {
            ...node.data,
            status,
            decision,
            reasoning,
            executionTimeMs,
          },
        };
      })
    );

    // Animate active edge along execution path
    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        let isAnimated = false;
        for (let i = 0; i < path.length - 1; i++) {
          if (path[i] === edge.source && path[i + 1] === edge.target) {
            isAnimated = true;
            break;
          }
        }
        return {
          ...edge,
          animated: isAnimated,
        };
      })
    );
  }, [executionState, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      let label = '';
      let decision = undefined;

      if (params.sourceHandle === 'yes') {
        label = 'YES';
        decision = 'YES';
      } else if (params.sourceHandle === 'no') {
        label = 'NO';
        decision = 'NO';
      }

      const newEdge: Edge = {
        ...params,
        id: `e_${params.source}_${params.target}_${Date.now()}`,
        type: 'decision',
        label,
        data: { decision },
      } as Edge;

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    onNodeSelect(node);
  };

  const handlePaneClick = () => {
    onNodeSelect(null);
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] bg-slate-950 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode="dark"
        className="bg-slate-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#334155" />
        <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300 !rounded-xl !shadow-xl" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'start') return '#06b6d4';
            if (n.type === 'action') return '#f59e0b';
            return '#6366f1';
          }}
          className="!bg-slate-900/90 !border-slate-800 !rounded-xl overflow-hidden shadow-2xl"
          maskColor="rgba(15, 23, 42, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};
