'use server';

import { ai } from '@/ai/genkit';
import { generate } from 'genkit/ai';
import { z } from 'zod';

const AnonymizeMessageInputSchema = z.object({
  message: z.string(),
});

const AnonymizeMessageOutputSchema = z.object({
  anonymizedMessage: z.string(),
  anonymized: z.boolean(),
});

export async function anonymizeMessage(input: z.infer<typeof AnonymizeMessageInputSchema>): Promise<z.infer<typeof AnonymizeMessageOutputSchema>> {
  const anonymizePrompt = ai.definePrompt(
    {
      name: 'anonymizePrompt',
      input: { schema: AnonymizeMessageInputSchema },
      prompt: `You are an AI responsible for anonymizing messages by removing or altering identifiable metadata.
Your goal is to protect the user's identity while preserving the message's content and meaning.
Analyze the following message and strip any information that could reveal the sender's identity, location, or other personal details like names, emails, addresses.
Rephrase the message to make it less identifiable. If no personal metadata is detected, return the original message.

Message: "{{message}}"

Anonymized Message:`,
    },
  );
  
  const llmResponse = await anonymizePrompt(input);
  const anonymizedMessage = llmResponse.text;

  return {
    anonymizedMessage: anonymizedMessage || input.message,
    anonymized: anonymizedMessage !== input.message,
  };
}
