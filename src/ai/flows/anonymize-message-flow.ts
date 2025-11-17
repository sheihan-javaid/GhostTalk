'use server';
/**
 * @fileoverview This file defines the server action for anonymizing messages using the OpenAI library.
 */

import OpenAI from 'openai';
import type { AnonymizeMessageInput, AnonymizeMessageOutput } from '@/lib/types';

// Initialize the OpenAI client to use the OpenRouter API.
const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * The server action that client components will call.
 * This function analyzes a message for PII and removes it.
 */
export async function anonymizeMessage(
  input: AnonymizeMessageInput
): Promise<AnonymizeMessageOutput> {
  const { message } = input;

  // If the message is empty or just whitespace, don't call the AI.
  if (!message.trim()) {
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
        model: 'google/gemini-pro', 
        messages: [
            {
                role: 'system',
                content: `You are an advanced AI assistant with an expert focus on privacy and data protection. Your primary function is to detect and redact Personally Identifiable Information (PII) from user messages.

PII includes, but is not limited to:
- Full names, first names, last names, or initials that can identify a person.
- Email addresses.
- Phone numbers.
- Physical addresses, cities, states, zip codes.
- Social security numbers or other government-issued IDs.
- Specific times and locations of meetings.

Your task is to analyze the user's message and perform one of the following actions:
1.  **If PII is detected**: You MUST rewrite the message to remove the PII, replacing it with a generic placeholder (e.g., "[name]", "[location]", "[contact info]"). The rewritten message should preserve the original meaning as much as possible. In this case, you MUST set the "anonymized" flag to true.
2.  **If NO PII is detected**: You MUST return the original, unaltered message. In this case, you MUST set the "anonymized" flag to false.

Example of a safe message: "This is a great idea, I totally agree with the plan."
Your response for this message should be: { "anonymizedMessage": "This is a great idea, I totally agree with the plan.", "anonymized": false }

You MUST respond ONLY with a single, valid JSON object in the following format:
{
  "anonymizedMessage": "The processed message content...",
  "anonymized": boolean
}`
            },
            {
                role: 'user',
                content: `Analyze and process this message: "${message}"`
            }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
    });
    
    const responseJson = completion.choices[0].message.content;

    if (!responseJson) {
      throw new Error('AI returned an empty response.');
    }

    const parsedResponse = JSON.parse(responseJson) as AnonymizeMessageOutput;

    // Ensure the response has the expected shape
    if (typeof parsedResponse.anonymizedMessage !== 'string' || typeof parsedResponse.anonymized !== 'boolean') {
      throw new Error('AI returned an invalid response format.');
    }

    return parsedResponse;

  } catch (error) {
    console.error('Anonymization action failed:', error);
    // On failure, return the original message to avoid blocking the user.
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }
}
