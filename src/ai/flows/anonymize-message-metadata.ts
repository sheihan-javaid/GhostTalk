'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const AnonymizeMessageInputSchema = z.object({
  message: z.string(),
});

const AnonymizeMessageOutputSchema = z.object({
  anonymizedMessage: z.string(),
  anonymized: z.boolean(),
});

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function anonymizeMessage(input: z.infer<typeof AnonymizeMessageInputSchema>): Promise<z.infer<typeof AnonymizeMessageOutputSchema>> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'mistralai/mistral-7b-instruct:free', 
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that specializes in privacy. Your task is to analyze the user's message for any Personally Identifiable Information (PII) and remove it.
PII includes: names, email addresses, phone numbers, physical addresses, social security numbers, or any other data that can be used to identify a specific person.

- If you detect PII, you MUST alter the message to hide or remove it, while trying to preserve the original meaning.
- If you do NOT detect any PII, you MUST return the original message completely unchanged.
- Your response should ONLY contain the final message text, with no extra explanations or introductory phrases.

Example 1 (PII detected):
User Input: "Hey, can you meet me at 123 Main St? My number is 555-1234."
Your Output: "Hey, can you meet me at the usual place?"

Example 2 (No PII):
User Input: "I'm running about 15 minutes late."
Your Output: "I'm running about 15 minutes late."`
        },
        { role: 'user', content: input.message },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const anonymizedMessage = completion.choices[0].message.content || input.message;

    return {
      anonymizedMessage,
      anonymized: anonymizedMessage.trim() !== input.message.trim(),
    };
  } catch (error) {
    console.error('Failed to anonymize message with OpenRouter:', error);
    // On failure, return original message to not block user
    return {
      anonymizedMessage: input.message,
      anonymized: false,
    };
  }
}
