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
          content: `You are an AI responsible for anonymizing messages by removing or altering identifiable metadata.
Your goal is to protect the user's identity while preserving the message's content and meaning.
Analyze the following message and strip any information that could reveal the sender's identity, location, or other personal details like names, emails, addresses.
Rephrase the message to make it less identifiable. If no personal metadata is detected, return the original message.
Do not add any extra text or explanation, just the anonymized message.`
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
