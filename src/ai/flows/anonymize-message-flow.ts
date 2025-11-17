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
 * If no PII is found, it returns the original message.
 */
export async function anonymizeMessage(
  input: AnonymizeMessageInput
): Promise<AnonymizeMessageOutput> {
  const { message } = input;

  // Do not process empty messages.
  if (!message.trim()) {
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "google/gemini-pro", // A capable model for following instructions
      response_format: { type: "json_object" }, // Enforce JSON output
      temperature: 0.1, // Low temperature for deterministic, rule-based behavior
      messages: [
        {
          role: "system",
          content: `
You are a very strict PII (Personally Identifiable Information) removal engine. Your ONLY job is to analyze the user's message and remove PII. You MUST follow these rules precisely.

1.  **PII to Redact**: You must detect and redact the following types of PII:
    - Names of people (e.g., John, Sarah, Rahul Kumar).
    - Contact details (e.g., test@example.com, 9876543210, WhatsApp numbers).
    - Specific locations (e.g., Delhi, 123 Main St, New York).
    - Unique personal identifiers (e.g., passport numbers, Aadhaar numbers, Social Security Numbers).

2.  **Redaction Format**: When you find PII, you MUST replace it with a generic placeholder in brackets. Use these placeholders ONLY:
    - \`[name]\` for names.
    - \`[contact]\` for emails, phone numbers, etc.
    - \`[location]\` for addresses, cities, etc.
    - \`[id]\` for unique identifiers.

3.  **DO NOT CHANGE NON-PII**: If a word or phrase is not PII, you MUST NOT change, rephrase, or paraphrase it. The sentence structure and all non-PII words MUST remain identical to the original message.

4.  **JSON Output ONLY**: You MUST respond ONLY with a single, valid JSON object in the following format:
    \`\`\`json
    {
      "anonymizedMessage": "The processed message goes here.",
      "anonymized": true_or_false
    }
    \`\`\`
    - The \`anonymizedMessage\` field contains the processed text.
    - The \`anonymized\` field MUST be \`true\` if you removed ANY PII.
    - The \`anonymized\` field MUST be \`false\` if you did NOT find any PII.

**EXAMPLES:**

- **Input**: "My name is John and I live in New York."
- **Correct Output**: 
  {"anonymizedMessage":"My name is [name] and I live in [location].", "anonymized":true}

- **Input**: "I think this is a great idea and we should proceed."
- **Correct Output**:
  {"anonymizedMessage":"I think this is a great idea and we should proceed.", "anonymized":false}

- **Input**: "hey, my name is john"
- **Correct Output**:
  {"anonymizedMessage":"hey, my name is [name]", "anonymized":true}

Do not add any explanations or extra text. Your entire response must be ONLY the JSON object.
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
      throw new Error("AI returned an empty or null response.");
    }

    let parsedResponse: AnonymizeMessageOutput;

    // Safely parse the JSON response from the AI.
    try {
      parsedResponse = JSON.parse(rawResponse);
    } catch (e) {
      console.error("Failed to parse JSON from AI response. Raw response:", rawResponse);
      throw new Error("AI returned invalid JSON.");
    }

    // Validate the structure of the parsed response.
    if (
      typeof parsedResponse.anonymizedMessage !== "string" ||
      typeof parsedResponse.anonymized !== "boolean"
    ) {
      console.error("AI returned a JSON object with the wrong structure:", parsedResponse);
      throw new Error("AI returned a malformed data structure.");
    }

    return parsedResponse;

  } catch (error) {
    console.error("Anonymization call failed:", error);

    // As a safe fallback, return the original message without modification.
    // This ensures the message can still be sent if the AI service fails.
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }
}
