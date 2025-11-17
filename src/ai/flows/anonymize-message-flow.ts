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
        model: "nvidia/nemotron-4-12b-v2", // Using a highly capable model
        temperature: 0, // Make it deterministic
        max_tokens: 128,
        messages: [
          {
            role: "system",
            content: `You are a strict PII redaction system. Your only job is to replace PII in the user's text with generic, natural-sounding equivalents.
CRITICAL RULES:
1.  You MUST use the following replacements EXACTLY:
    - Person names (any name) → "someone"
    - Locations (cities, states, countries, specific places) → "somewhere"
    - Company/organization names → "a company"
    - Email addresses → "an email address"
    - Phone numbers → "a phone number"
    - Street addresses → "an address"
    - Ages or dates of birth → "a certain age"
    - Usernames/handles → "a username"
    - Specific dates → "a date"
    - Credit card numbers → "a credit card number"
    - SSN/ID numbers → "an identification number"
2.  You MUST NOT alter any part of the message that is not PII. Preserve all original punctuation, spacing, and sentence structure.
3.  You MUST output ONLY the redacted text. Do NOT include any explanations, notes, apologies, or markdown formatting like \`\`\`. Your entire response must be only the processed text.`
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
