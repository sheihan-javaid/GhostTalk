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
        model: 'mistralai/mistral-7b-instruct:free', 
        messages: [
            {
                role: 'system',
                content: `You are an AI assistant specializing in privacy. Analyze the user's message for Personally Identifiable Information (PII) like names, emails, addresses, phone numbers, etc.
- If you find PII, rewrite the message to remove it, preserving the original meaning. Set "anonymized" to true.
- If you find NO PII, return the original message unchanged. Set "anonymized" to false.
Respond ONLY with a valid JSON object in the format: { "anonymizedMessage": "...", "anonymized": boolean }`
            },
            {
                role: 'user',
                content: `Analyze this message: "${message}"`
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
