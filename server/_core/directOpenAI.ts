/**
 * directOpenAI.ts — Direct OpenAI API integration
 * Uses GPT-4o. ~$0.03/article. Second fallback after Groq.
 */

import type { InvokeParams, InvokeResult, Message } from "./llm";

const OPENAI_API_BASE = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
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

export async function invokeOpenAIDirect(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("[OpenAI] OPENAI_API_KEY is not set");

  const model = params.model?.startsWith("openai/") ? params.model.replace("openai/", "") : DEFAULT_OPENAI_MODEL;

  const payload: Record<string, unknown> = {
    model,
    messages: params.messages.map(normalizeMessage),
    max_tokens: params.max_tokens ?? params.maxTokens ?? 8192,
  };

  const rf = params.response_format ?? params.responseFormat;
  if (rf && (rf as Record<string, unknown>).type === "json_schema") {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(OPENAI_API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error("[OpenAI] API error " + response.status + ": " + error);
  }

  const data = await response.json() as any;

  return {
    id: data.id || "openai-" + Date.now(),
    created: data.created || Math.floor(Date.now() / 1000),
    model: data.model || model,
    choices: (data.choices || []).map((c: any, i: number) => ({
      index: i,
      message: { role: "assistant" as const, content: c.message?.content || "" },
      finish_reason: c.finish_reason || "stop",
    })),
    usage: data.usage,
  };
}
