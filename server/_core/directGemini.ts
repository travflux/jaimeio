/**
 * directGemini.ts — Direct Google Gemini API integration
 * Uses gemini-2.5-flash. ~$0.002/article. Final fallback.
 */

import type { InvokeParams, InvokeResult, Message, MessageContent } from "./llm";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function extractText(content: MessageContent | MessageContent[]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(part =>
      typeof part === "string" ? part :
      "type" in part && part.type === "text" ? (part as { type: "text"; text: string }).text : ""
    ).filter(Boolean).join("\n");
  }
  if (typeof content === "object" && "type" in content && content.type === "text") {
    return (content as { type: "text"; text: string }).text;
  }
  return "";
}

export async function invokeGeminiDirect(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("[Gemini] GEMINI_API_KEY is not set");

  const model = params.model?.startsWith("gemini/") ? params.model.replace("gemini/", "") : DEFAULT_GEMINI_MODEL;

  const systemMsg = params.messages.find(m => m.role === "system");
  const conversationMsgs = params.messages.filter(m => m.role !== "system");

  const contents = conversationMsgs.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: extractText(msg.content) }],
  }));

  const requestBody: Record<string, unknown> = { contents };

  if (systemMsg) {
    requestBody.systemInstruction = { parts: [{ text: extractText(systemMsg.content) }] };
  }

  const rf = params.response_format ?? params.responseFormat;
  if (rf && (rf as Record<string, unknown>).type === "json_schema") {
    requestBody.generationConfig = { responseMimeType: "application/json" };
  }

  const url = GEMINI_API_BASE + "/" + model + ":generateContent?key=" + apiKey;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error("[Gemini] API error " + response.status + ": " + error);
  }

  const data = await response.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";

  return {
    id: "gemini-" + Date.now(),
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: { role: "assistant" as const, content: text },
      finish_reason: data.candidates?.[0]?.finishReason ?? "stop",
    }],
    usage: data.usageMetadata ? {
      prompt_tokens: data.usageMetadata.promptTokenCount || 0,
      completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
      total_tokens: (data.usageMetadata.promptTokenCount || 0) + (data.usageMetadata.candidatesTokenCount || 0),
    } : undefined,
  };
}
