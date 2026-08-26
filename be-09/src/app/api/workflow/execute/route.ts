import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { evaluateDecisionNode } from "@/lib/llm";
import { ExecutionLog } from "@/types/workflow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId, initialInput, nodes, edges, apiKey, mode } = body;

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json({ error: "Invalid nodes array in workflow graph." }, { status: 400 });
    }

    // Try sending to Inngest Event Bus first
    let inngestEventSent = false;
    try {
      await inngest.send({
        name: "workflow/execute",
        data: {
          runId,
          initialInput,
          nodes,
          edges,
          apiKey,
        },
      });
      inngestEventSent = true;
    } catch (e: any) {
      console.warn("Inngest dev server event dispatch fallback:", e?.message);
    }

    // Synchronous execution pipeline for instant visual UI feedback
    const startNode = nodes.find((n: any) => n.type === "start") || nodes[0];
    let currentNodeId: string | null = startNode.id;
    let stepCount = 0;
    const visitedNodes: string[] = [startNode.id];
    const logs: ExecutionLog[] = [];
    const maxSteps = 20;

    while (currentNodeId && stepCount < maxSteps) {
      stepCount++;
      const currentId: string = currentNodeId;
      const nodeObj = nodes.find((n: any) => n.id === currentId);

      if (!nodeObj) break;

      if (nodeObj.type === "aiDecision") {
        const prompt = nodeObj.data?.prompt || "Is this request valid?";
        const systemContext = nodeObj.data?.systemContext || "";

        const result = await evaluateDecisionNode(
          initialInput,
          prompt,
          systemContext,
          apiKey
        );

        logs.push({
          id: `log_${Date.now()}_${stepCount}`,
          timestamp: new Date().toLocaleTimeString(),
          nodeId: currentId,
          nodeLabel: nodeObj.data?.label || "AI Decision Node",
          stepNumber: stepCount,
          prompt,
          decision: result.decision,
          reasoning: result.reasoning,
          latencyMs: result.latencyMs,
          status: "success",
        });

        const targetDecision = result.decision.toLowerCase();
        const outgoingEdge = edges.find(
          (e: any) =>
            e.source === currentId &&
            (e.sourceHandle === targetDecision ||
              (e.label && e.label.toLowerCase() === targetDecision) ||
              e.data?.decision === result.decision)
        ) || edges.find((e: any) => e.source === currentId);

        if (outgoingEdge) {
          currentNodeId = outgoingEdge.target;
          visitedNodes.push(outgoingEdge.target);
        } else {
          currentNodeId = null;
        }
      } else if (nodeObj.type === "action") {
        logs.push({
          id: `log_${Date.now()}_${stepCount}`,
          timestamp: new Date().toLocaleTimeString(),
          nodeId: currentId,
          nodeLabel: nodeObj.data?.label || "Action Outcome",
          stepNumber: stepCount,
          prompt: nodeObj.data?.actionDetails || "Workflow Outcome",
          decision: "ACTION",
          reasoning: `Reached terminal action node: ${nodeObj.data?.label}`,
          latencyMs: 15,
          status: "success",
        });
        currentNodeId = null;
      } else {
        const outgoingEdge = edges.find((e: any) => e.source === currentId);
        if (outgoingEdge) {
          currentNodeId = outgoingEdge.target;
          visitedNodes.push(outgoingEdge.target);
        } else {
          currentNodeId = null;
        }
      }
    }

    return NextResponse.json({
      success: true,
      inngestTriggered: inngestEventSent,
      runId,
      executionPath: visitedNodes,
      logs,
      totalSteps: stepCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute workflow." }, { status: 500 });
  }
}
