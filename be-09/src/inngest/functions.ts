import { inngest } from "./client";
import { evaluateDecisionNode } from "@/lib/llm";
import { ExecutionLog } from "@/types/workflow";

export const executeWorkflow = inngest.createFunction(
  { id: "execute-ai-workflow", name: "Execute AI Decision Workflow Graph" },
  { event: "workflow/execute" },
  async ({ event, step }) => {
    const { runId, initialInput, nodes, edges, apiKey } = event.data;

    // Step 1: Initialize workflow validation
    const startNode = await step.run("init-workflow", async () => {
      const start = nodes.find((n: any) => n.type === "start") || nodes[0];
      if (!start) {
        throw new Error("Invalid workflow graph: No starting node found.");
      }
      return {
        id: start.id,
        label: start.data?.label || "Start Node",
        input: initialInput,
      };
    });

    let currentNodeId: string | null = startNode.id;
    let stepCount = 0;
    const visitedNodes: string[] = [startNode.id];
    const logs: ExecutionLog[] = [];
    const maxSteps = 25; // prevent infinite loops

    while (currentNodeId && stepCount < maxSteps) {
      stepCount++;
      const currentId = currentNodeId;
      const nodeObj = nodes.find((n: any) => n.id === currentId);

      if (!nodeObj) break;

      // Handle AI Decision Node
      if (nodeObj.type === "aiDecision") {
        const prompt = nodeObj.data?.prompt || "Is this valid?";
        const systemContext = nodeObj.data?.systemContext || "";

        // Execute Inngest step for this AI Decision Node
        const result = await step.run(`evaluate-node-${currentId}`, async () => {
          return await evaluateDecisionNode(initialInput, prompt, systemContext, apiKey);
        });

        const logItem: ExecutionLog = {
          id: `log_${Date.now()}_${stepCount}`,
          timestamp: new Date().toLocaleTimeString(),
          nodeId: currentId,
          nodeLabel: nodeObj.data?.label || "AI Decision",
          stepNumber: stepCount,
          prompt,
          decision: result.decision,
          reasoning: result.reasoning,
          latencyMs: result.latencyMs,
          status: "success",
        };
        logs.push(logItem);

        // Determine next path target handle ('yes' or 'no')
        const targetDecision = result.decision.toLowerCase();
        const outgoingEdge = edges.find(
          (e: any) =>
            e.source === currentId &&
            (e.sourceHandle === targetDecision ||
              (e.label && e.label.toLowerCase() === targetDecision) ||
              e.data?.decision === result.decision)
        ) || edges.find((e: any) => e.source === currentId); // fallback edge if single connection

        if (outgoingEdge) {
          currentNodeId = outgoingEdge.target;
          visitedNodes.push(outgoingEdge.target);
        } else {
          currentNodeId = null; // terminal leaf reached
        }
      } 
      // Handle Action / End Node
      else if (nodeObj.type === "action") {
        const actionResult = await step.run(`action-step-${currentId}`, async () => {
          return {
            executed: true,
            actionLabel: nodeObj.data?.label || "Action Outcome",
            timestamp: new Date().toISOString(),
          };
        });

        logs.push({
          id: `log_${Date.now()}_${stepCount}`,
          timestamp: new Date().toLocaleTimeString(),
          nodeId: currentId,
          nodeLabel: nodeObj.data?.label || "Action Node",
          stepNumber: stepCount,
          prompt: `Action Executed: ${nodeObj.data?.actionDetails || 'Completed workflow path'}`,
          decision: "ACTION",
          reasoning: `Workflow reached final action node: ${actionResult.actionLabel}`,
          latencyMs: 12,
          status: "success",
        });

        currentNodeId = null; // Workflow completed
      } else {
        // Start node or generic node - move to next edge
        const outgoingEdge = edges.find((e: any) => e.source === currentId);
        if (outgoingEdge) {
          currentNodeId = outgoingEdge.target;
          visitedNodes.push(outgoingEdge.target);
        } else {
          currentNodeId = null;
        }
      }
    }

    return {
      runId,
      status: "completed",
      totalSteps: stepCount,
      executionPath: visitedNodes,
      logs,
    };
  }
);

export const functions = [executeWorkflow];
