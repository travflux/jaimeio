/**
 * directGroq.ts — Direct Groq API integration
 * Uses Llama 3.3 70B. ~$0.001/article, 2-5x faster than Anthropic.
 */

import type { InvokeParams, InvokeResult, Message } from "./llm";

const GROQ_API_BASE = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}

function normalizeMessage(msg: Message): Record<string, unknown> {
  const role = msg.role === "function" ? "tool" : msg.role;
  if (typeof msg.content === "string") return { role, content: msg.content };
  if (Array.isArray(msg.content)) {
    const text = msg.content
      .filter((c): c is { type: "text"; text: string } => typeof c === "object" && "type" in c && c.type === "text")
      .map(c => c.text).join("\n");
    return { role, content: text };
  }
  return { role, content: String(msg.content) };
}

export async function invokeGroqDirect(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("[Groq] GROQ_API_KEY is not set");

  const model = params.model?.startsWith("groq/") ? params.model.replace("groq/", "") : DEFAULT_GROQ_MODEL;

  const payload: Record<string, unknown> = {
    model,
    messages: params.messages.map(normalizeMessage),
    max_tokens: params.max_tokens ?? params.maxTokens ?? 8192,
  };

  const rf = params.response_format ?? params.responseFormat;
  if (rf && (rf as Record<string, unknown>).type === "json_schema") {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(GROQ_API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error("[Groq] API error " + response.status + ": " + error);
  }

  const data = await response.json() as any;

  return {
    id: data.id || "groq-" + Date.now(),
    created: data.created || Math.floor(Date.now() / 1000),
    model: data.model || model,
    choices: (data.choices || []).map((c: any, i: number) => ({
      index: i,
      message: { role: "assistant" as const, content: c.message?.content || "" },
      finish_reason: c.finish_reason || "stop",
    })),
    usage: data.usage ? {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.prompt_tokens + data.usage.completion_tokens,
    } : undefined,
  };
}
