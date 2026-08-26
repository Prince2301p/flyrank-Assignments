import OpenAI from "openai";

export interface DecisionResult {
  decision: "YES" | "NO";
  reasoning: string;
  latencyMs: number;
}

export async function evaluateDecisionNode(
  inputPayload: string,
  promptQuestion: string,
  systemContext?: string,
  userApiKey?: string,
  userBaseUrl?: string
): Promise<DecisionResult> {
  const startTime = Date.now();
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  const baseUrl = userBaseUrl || process.env.OPENAI_BASE_URL;

  // If an API key is available, use live OpenAI / API SDK call
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true,
      });

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${systemContext || "You are an AI decision engine step."}\n\nYou evaluate inputs against strict questions. You MUST respond strictly in valid JSON format as follows:
{
  "decision": "YES" or "NO",
  "reasoning": "A short clear sentence explaining why."
}`,
          },
          {
            role: "user",
            content: `[Workflow Input Data]:\n"${inputPayload}"\n\n[Decision Question to Answer]:\n"${promptQuestion}"`,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content;

      if (content) {
        const parsed = JSON.parse(content);
        const rawDecision = String(parsed.decision).toUpperCase().trim();
        const decision = rawDecision.includes("YES") ? "YES" : "NO";
        const reasoning = parsed.reasoning || `Model evaluated criteria with ${decision}.`;
        return { decision, reasoning, latencyMs };
      }
    } catch (err: any) {
      console.warn("LLM API Call warning, falling back to heuristic decision evaluator:", err?.message);
    }
  }

  // Smart Heuristic Fallback Evaluator (Runs when no key is present or on API error)
  // Simulates realistic reasoning delay (300ms - 800ms)
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 300));
  const latencyMs = Date.now() - startTime;

  const combinedText = `${inputPayload} ${promptQuestion}`.toLowerCase();
  const questionLower = promptQuestion.toLowerCase();

  // Heuristic rule matching for common flow node checks
  let isYes = false;
  let reasoning = "";

  if (questionLower.includes("support") || questionLower.includes("help") || questionLower.includes("bug")) {
    if (combinedText.includes("support") || combinedText.includes("issue") || combinedText.includes("help") || combinedText.includes("broken") || combinedText.includes("error") || combinedText.includes("reset") || combinedText.includes("fail")) {
      isYes = true;
      reasoning = "Input contains explicit technical/support request keywords (help, issue, error).";
    } else {
      isYes = false;
      reasoning = "Input does not indicate a technical support or help request.";
    }
  } else if (questionLower.includes("sales") || questionLower.includes("buy") || questionLower.includes("pricing") || questionLower.includes("demo")) {
    if (combinedText.includes("buy") || combinedText.includes("price") || combinedText.includes("cost") || combinedText.includes("quote") || combinedText.includes("enterprise") || combinedText.includes("sales") || combinedText.includes("demo")) {
      isYes = true;
      reasoning = "Detected commercial purchase intent or inquiry regarding pricing/demo.";
    } else {
      isYes = false;
      reasoning = "No commercial purchase or pricing intent found in input.";
    }
  } else if (questionLower.includes("spam") || questionLower.includes("scam") || questionLower.includes("urgent money")) {
    if (combinedText.includes("winner") || combinedText.includes("crypto") || combinedText.includes("click link") || combinedText.includes("casino") || combinedText.includes("claim prize") || combinedText.includes("viagra")) {
      isYes = true;
      reasoning = "Flagged high-risk spam/phishing pattern in message content.";
    } else {
      isYes = false;
      reasoning = "Message text passed standard anti-spam heuristics.";
    }
  } else if (questionLower.includes("high priority") || questionLower.includes("urgent")) {
    if (combinedText.includes("urgent") || combinedText.includes("asap") || combinedText.includes("down") || combinedText.includes("outage") || combinedText.includes("critical") || combinedText.includes("immediately")) {
      isYes = true;
      reasoning = "Urgency marker detected (urgent/down/critical).";
    } else {
      isYes = false;
      reasoning = "Standard priority level determined.";
    }
  } else {
    // Default fallback based on affirmative terms or text length
    const words = inputPayload.trim().split(/\s+/);
    isYes = words.length > 5 || combinedText.includes("yes") || combinedText.includes("true");
    reasoning = `Evaluated decision criteria '${promptQuestion}'. Standard heuristic match: ${isYes ? 'YES' : 'NO'}.`;
  }

  return {
    decision: isYes ? "YES" : "NO",
    reasoning,
    latencyMs,
  };
}
