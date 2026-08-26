import { Node, Edge } from '@xyflow/react';

export type NodeStatus = 'idle' | 'running' | 'passed_yes' | 'passed_no' | 'failed';

export interface AIDecisionNodeData extends Record<string, unknown> {
  label: string;
  prompt: string;
  systemContext?: string;
  status?: NodeStatus;
  decision?: 'YES' | 'NO' | null;
  reasoning?: string;
  executionTimeMs?: number;
  error?: string;
}

export interface StartNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  status?: NodeStatus;
}

export interface ActionNodeData extends Record<string, unknown> {
  label: string;
  actionType?: string;
  actionDetails?: string;
  status?: NodeStatus;
  executionTimeMs?: number;
  resultPayload?: string;
}

export type CustomNodeData = AIDecisionNodeData | StartNodeData | ActionNodeData;

export interface ExecutionLog {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeLabel: string;
  stepNumber: number;
  prompt: string;
  decision: 'YES' | 'NO' | 'ACTION';
  reasoning: string;
  latencyMs: number;
  status: 'success' | 'failed';
  error?: string;
}

export interface WorkflowExecutionState {
  runId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  initialInput: string;
  currentNodeId?: string;
  activeEdgeId?: string;
  executionPath: string[];
  logs: ExecutionLog[];
  totalLatencyMs: number;
  error?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}
