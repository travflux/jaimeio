/**
 * llmRouter.ts — Intelligent LLM routing with fallback chain and retry.
 *
 * Provider priority: Groq → Anthropic → OpenAI → Gemini
 * Each provider retried up to 3 times with backoff before fallthrough.
 * Retry: immediate → 5s → 15s → next provider.
 */

import type { InvokeParams, InvokeResult } from "./llm";
import { invokeLLM as invokeAnthropic } from "./llm";
import { invokeGroqDirect, isGroqAvailable } from "./directGroq";
import { invokeOpenAIDirect, isOpenAIAvailable } from "./directOpenAI";
import { invokeGeminiDirect, isGeminiAvailable } from "./directGemini";

const RETRY_DELAYS_MS = [0, 5_000, 15_000];
const RETRYABLE_STATUS_CODES = new Set([429, 503, 502, 504, 412, 529]);

let lastUsedProvider = "unknown";

export function getLastUsedProvider(): string {
  return lastUsedProvider;
}

function getStatusCode(err: unknown): number | null {
  if (err instanceof Error) {
    const match = err.message.match(/(\d{3})/);
    if (match) return parseInt(match[1]);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryProviderWithRetry(
  providerName: string,
  providerFn: (params: InvokeParams) => Promise<InvokeResult>,
  params: InvokeParams,
  maxRetries = 3
): Promise<InvokeResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt] ?? 15_000;
      console.log("[LLM Router] " + providerName + " retry " + attempt + "/" + (maxRetries - 1) + " in " + delay + "ms");
      await sleep(delay);
    }

    try {
      const result = await providerFn(params);
      if (attempt > 0) console.log("[LLM Router] " + providerName + " succeeded on retry " + attempt);
      return result;
    } catch (err) {
      lastError = err;
      const status = getStatusCode(err);
      // Non-retryable errors — move to next provider immediately
      if (status !== null && !RETRYABLE_STATUS_CODES.has(status)) {
        console.log("[LLM Router] " + providerName + " non-retryable error " + status);
        throw err;
      }
      console.log("[LLM Router] " + providerName + " attempt " + (attempt + 1) + " failed: " + (err instanceof Error ? err.message.substring(0, 120) : err));
    }
  }

  throw lastError;
}

export async function invokeLLMWithFallback(params: InvokeParams): Promise<InvokeResult> {
  const errors: Array<{ provider: string; error: string }> = [];

  // Provider 1: Groq
  if (isGroqAvailable()) {
    try {
      console.log("[LLM Router] Trying Groq");
      const result = await tryProviderWithRetry("Groq", invokeGroqDirect, params);
      lastUsedProvider = "groq";
      return result;
    } catch (err) {
      errors.push({ provider: "groq", error: err instanceof Error ? err.message.substring(0, 100) : String(err) });
      console.log("[LLM Router] Groq failed — falling back to Anthropic");
    }
  }

  // Provider 2: Anthropic
  try {
    console.log("[LLM Router] Trying Anthropic");
    const result = await tryProviderWithRetry("Anthropic", invokeAnthropic, params);
    lastUsedProvider = "anthropic";
    return result;
  } catch (err) {
    errors.push({ provider: "anthropic", error: err instanceof Error ? err.message.substring(0, 100) : String(err) });
    console.log("[LLM Router] Anthropic failed — falling back to OpenAI");
  }

  // Provider 3: OpenAI
  if (isOpenAIAvailable()) {
    try {
      console.log("[LLM Router] Trying OpenAI");
      const result = await tryProviderWithRetry("OpenAI", invokeOpenAIDirect, params);
      lastUsedProvider = "openai";
      return result;
    } catch (err) {
      errors.push({ provider: "openai", error: err instanceof Error ? err.message.substring(0, 100) : String(err) });
      console.log("[LLM Router] OpenAI failed — falling back to Gemini");
    }
  }

  // Provider 4: Gemini
  if (isGeminiAvailable()) {
    try {
      console.log("[LLM Router] Trying Gemini");
      const result = await tryProviderWithRetry("Gemini", invokeGeminiDirect, params);
      lastUsedProvider = "gemini";
      return result;
    } catch (err) {
      errors.push({ provider: "gemini", error: err instanceof Error ? err.message.substring(0, 100) : String(err) });
    }
  }

  const summary = errors.map(e => e.provider + ": " + e.error).join(" | ");
  throw new Error("[LLM Router] All providers failed. " + summary);
}

// ─── Per-tenant provider preference ───────────────────────────────────────────

export type LLMProvider = "auto" | "groq" | "anthropic" | "openai" | "gemini";

export async function invokeLLMWithProvider(
  params: InvokeParams,
  preferredProvider: LLMProvider = "auto"
): Promise<InvokeResult> {
  if (preferredProvider === "auto") return invokeLLMWithFallback(params);

  try {
    switch (preferredProvider) {
      case "groq":
        if (!isGroqAvailable()) throw new Error("Groq not available");
        lastUsedProvider = "groq";
        return await tryProviderWithRetry("Groq", invokeGroqDirect, params);
      case "openai":
        if (!isOpenAIAvailable()) throw new Error("OpenAI not available");
        lastUsedProvider = "openai";
        return await tryProviderWithRetry("OpenAI", invokeOpenAIDirect, params);
      case "gemini":
        if (!isGeminiAvailable()) throw new Error("Gemini not available");
        lastUsedProvider = "gemini";
        return await tryProviderWithRetry("Gemini", invokeGeminiDirect, params);
      case "anthropic":
        lastUsedProvider = "anthropic";
        return await tryProviderWithRetry("Anthropic", invokeAnthropic, params);
    }
  } catch (err) {
    console.log("[LLM Router] Preferred provider " + preferredProvider + " failed, using fallback chain");
    return invokeLLMWithFallback(params);
  }
}

export function getLLMProviderStatus(): Record<string, boolean> {
  return {
    groq: isGroqAvailable(),
    anthropic: true,
    openai: isOpenAIAvailable(),
    gemini: isGeminiAvailable(),
  };
}
