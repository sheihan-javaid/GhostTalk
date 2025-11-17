'use server';

import OpenAI from 'openai';
import type { AnonymizeMessageInput, AnonymizeMessageOutput } from '@/lib/types';

// Initialize OpenAI through OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://ghost-talk-ai.web.app",
    "X-Title": "GhostTalk",
  },
});

/**
 * Server Action: Anonymizes a message by removing ONLY PII.
 * If anonymization is disabled or no PII is found → returns original message.
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

  try {
    const completion = await openai.chat.completions.create({
      model: "google/gemini-pro",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `
You are a STRICT PII-removal engine. 

You MUST:
- Detect and redact ONLY real PII.
- Do NOT modify or paraphrase NON-PII text.
- Keep sentence structure identical unless PII must be removed.
- Output JSON ONLY.

PII to redact:
- Names of people (John, Sarah, Rahul, etc.)
- Contact details (email, phone, WhatsApp, etc.)
- Locations (cities, states, addresses)
- Identifiers (passport, Aadhaar, ID numbers)

Redaction format:
  [name], [contact], [location], [id]

Examples:

Input: "My name is Rahul and I live in Delhi."
Output: 
{"anonymizedMessage":"My name is [name] and I live in [location].", "anonymized":true}

Input: "I think this idea is amazing."
Output:
{"anonymizedMessage":"I think this idea is amazing.", "anonymized":false}

IMPORTANT:
- If NO PII detected → anonymized MUST be false.
- If ANY PII removed → anonymized MUST be true.
- Do NOT hallucinate PII.
- Do NOT rewrite non-PII words.
`
        },
        {
          role: "user",
          content: `Message: "${message}"`
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content;

    if (!raw) throw new Error("Empty AI response");

    let parsed: AnonymizeMessageOutput;

    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Invalid JSON from AI:", raw);
      throw new Error("AI returned invalid JSON");
    }

    if (
      typeof parsed.anonymizedMessage !== "string" ||
      typeof parsed.anonymized !== "boolean"
    ) {
      throw new Error("AI returned wrong structure");
    }

    return parsed;

  } catch (error) {
    console.error("Anonymization failed:", error);

    // Fallback: return original message unmodified
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }
}
