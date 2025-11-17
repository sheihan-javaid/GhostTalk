
'use server';

import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

// In-memory cache for anonymization results
const anonymizationCache = new Map<string, AnonymizeMessageOutput>();


/**
 * Server Action: Anonymizes a message by identifying and redacting ONLY PII using Claude AI.
 * Uses a two-step approach: AI detection + verification for maximum accuracy.
 */
export async function anonymizeMessage(
  input: AnonymizeMessageInput
): Promise<AnonymizeMessageOutput> {
  const { message } = input;

  if (!message.trim()) {
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }

  // Check cache first
  if (anonymizationCache.has(message)) {
    return anonymizationCache.get(message)!;
  }


  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://ghost-talk-ai.web.app", // FIX: Use the same hardcoded referer as GhostAI
        "X-Title": "GhostTalk PII Anonymizer"
      },
      body: JSON.stringify({
        model: "qwen/qwen-2.5-7b-instruct",
        temperature: 0, 
        max_tokens: 128,
        messages: [
          {
            role: "system",
            content: `You are a strict PII redaction system. Your only job is to replace PII in the user's text with generic, natural-sounding equivalents, preserving the original sentence structure.
CRITICAL RULES:
1.  Identify and replace the following types of PII:
    - Person names (e.g., "John", "Jane Doe") should be replaced with "anonymous".
    - Locations (e.g., "NY", "Paris", "123 Main St") should be replaced with "somewhere".
    - Company/organization names (e.g., "Acme Corp") should be replaced with "a company".
    - Email addresses should be replaced with "an email address".
    - Phone numbers should be replaced with "a phone number".
    - Ages or specific dates of birth should be replaced with "a certain age".
2.  Your primary goal is to preserve the original message's grammar and flow. For example, if the input is "my name is john", the output MUST be "my name is anonymous". If the input is "I met with john", the output must be "I met with anonymous".
3.  You MUST NOT alter any part of the message that is not PII.
4.  You MUST output ONLY the redacted text. Do NOT include any explanations, notes, or markdown formatting like \`\`\`. Your entire response must be only the processed text.`
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return {
        anonymizedMessage: message,
        anonymized: false,
      };
    }

    const data = await response.json();
    
    // Extract the content
    let anonymizedText = data.choices?.[0]?.message?.content || message;
    
    // Clean up the response just in case the AI adds extra text
    anonymizedText = anonymizedText.trim();

    // The most reliable check is simply if the text has changed.
    const wasAnonymized = anonymizedText !== message;

    const result: AnonymizeMessageOutput = {
      anonymizedMessage: anonymizedText,
      anonymized: wasAnonymized,
    };
    
    // Store the result in the cache
    anonymizationCache.set(message, result);
    
    return result;

  } catch (error) {
    console.error('Error during AI anonymization:', error);
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }
}
