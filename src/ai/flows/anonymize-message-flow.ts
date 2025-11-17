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
 * Server Action: Anonymizes a message by removing ONLY PII using an AI model.
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
      temperature: 0.2, // Lower temperature for more deterministic behavior
      messages: [
        {
          role: "system",
          content: `You are a strict PII (Personally Identifiable Information) removal engine. Your task is to analyze the user's message and redact any PII you find.

You MUST follow these rules:
1.  Detect and redact ONLY real PII. This includes:
    - Names of people (e.g., John, Sarah)
    - Contact details (e.g., emails, phone numbers)
    - Specific locations (e.g., cities, addresses)
    - Personal identification numbers.
2.  Replace redacted information with generic placeholders: [name], [contact], [location], [id].
3.  Do NOT modify, paraphrase, or change any part of the message that is NOT PII. The sentence structure must remain identical.
4.  You MUST respond ONLY with a single, valid JSON object in the specified format: { "anonymizedMessage": "...", "anonymized": ... }.

Example 1:
User Message: "My name is John and my email is john.doe@example.com"
Your Response:
{"anonymizedMessage":"My name is [name] and my email is [contact].", "anonymized":true}

Example 2:
User Message: "This is a great idea for a project."
Your Response:
{"anonymizedMessage":"This is a great idea for a project.", "anonymized":false}
`
        },
        {
          role: "user",
          content: `Message: "${message}"`
        }
      ]
    });

    const rawResponse = completion.choices?.[0]?.message?.content;
    if (!rawResponse) {
      throw new Error("AI returned an empty response.");
    }

    const parsedResponse: AnonymizeMessageOutput = JSON.parse(rawResponse);

    // Validate the structure of the parsed response
    if (
      typeof parsedResponse.anonymizedMessage !== "string" ||
      typeof parsedResponse.anonymized !== "boolean"
    ) {
      throw new Error("AI returned a malformed JSON object.");
    }

    return parsedResponse;

  } catch (error) {
    console.error("Anonymization failed:", error);
    // In case of any error (API failure, parsing error, etc.),
    // fall back to returning the original message to prevent interruption.
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }
}
