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
    defaultHeaders: {
        "HTTP-Referer": "https://ghost-talk-ai.web.app",
        "X-Title": "GhostTalk",
    },
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
                content: `You are a strict PII (Personally Identifiable Information) redaction engine. Your only purpose is to find and remove sensitive information from a given message.

You MUST identify and redact the following PII:
- Names of people (e.g., "John Doe", "Jane")
- Contact information (e.g., email addresses, phone numbers)
- Locations (e.g., addresses, cities, states)
- Any other data that could uniquely identify a person.

Follow these rules STRICTLY:
1. If you detect any PII, you MUST replace it with a generic placeholder (e.g., "[name]", "[contact info]", "[location]").
2. If you rewrite the message to redact PII, you MUST set the "anonymized" flag to true.
3. If the message contains NO PII, you MUST return the original, unaltered message and set the "anonymized" flag to false.

Example 1 (PII Detected):
User message: "My name is Mark and my email is mark@example.com."
Your response: { "anonymizedMessage": "My name is [name] and my email is [contact info].", "anonymized": true }

Example 2 (No PII):
User message: "This is a great idea, I totally agree with the plan."
Your response: { "anonymizedMessage": "This is a great idea, I totally agree with the plan.", "anonymized": false }

You MUST respond ONLY with a single, valid JSON object in the specified format.`
            },
            {
                role: 'user',
                content: `Message: "${message}"`
            }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
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
