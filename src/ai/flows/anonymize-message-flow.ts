'use server';
/**
 * @fileoverview This file defines the Genkit flow and server action for anonymizing messages.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AnonymizeMessageInputSchema, AnonymizeMessageOutputSchema } from '@/lib/types';
import type { AnonymizeMessageInput, AnonymizeMessageOutput } from '@/lib/types';

// Define the Genkit prompt. This tells the AI what to do.
const anonymizePrompt = ai.definePrompt({
  name: 'anonymizeMessagePrompt',
  input: { schema: AnonymizeMessageInputSchema },
  output: { schema: AnonymizeMessageOutputSchema },
  prompt: `You are an AI assistant specializing in privacy and data protection. Your task is to analyze the user's message for any Personally Identifiable Information (PII) and remove it.

PII includes, but is not limited to:
- Full names or identifiable parts of names
- Email addresses
- Phone numbers
- Physical addresses or locations
- Social Security Numbers or other government IDs
- Usernames or handles from other services
- Any other data that could uniquely identify a person.

Your instructions are:
1.  Analyze the following message: {{{message}}}
2.  If you detect ANY PII, you MUST alter the message to remove or generalize it, while preserving the original meaning as much as possible. Set the 'anonymized' flag to true.
3.  If you DO NOT detect any PII, you MUST return the original message completely unchanged. Set the 'anonymized' flag to false.

Respond ONLY with a valid JSON object matching the defined output schema.

Example 1 (PII detected):
User Input: "Hey, can you meet me at 123 Main St, Anytown? My number is 555-1234. - John Doe"
Your JSON Output: { "anonymizedMessage": "Hey, can you meet me at the usual place?", "anonymized": true }

Example 2 (No PII):
User Input: "I'm running about 15 minutes late."
Your JSON Output: { "anonymizedMessage": "I'm running about 15 minutes late.", "anonymized": false }
`,
});

// Define the Genkit flow that orchestrates the AI call.
const anonymizeMessageFlow = ai.defineFlow(
  {
    name: 'anonymizeMessageFlow',
    inputSchema: AnonymizeMessageInputSchema,
    outputSchema: AnonymizeMessageOutputSchema,
  },
  async (input: AnonymizeMessageInput): Promise<AnonymizeMessageOutput> => {
    // If the message is empty or just whitespace, don't call the AI.
    if (!input.message.trim()) {
      return {
        anonymizedMessage: input.message,
        anonymized: false,
      };
    }
    
    // Call the AI with the structured prompt.
    const { output } = await anonymizePrompt(input);

    // If the AI gives a valid output, return it.
    if (output) {
      return output;
    }

    // As a fallback, if the AI fails to produce a valid output, return the original message.
    console.error('Anonymization flow failed to get a valid output from the AI.');
    return {
      anonymizedMessage: input.message,
      anonymized: false,
    };
  }
);


/**
 * The server action that client components will call.
 * This wraps the Genkit flow and handles potential errors.
 */
export async function anonymizeMessage(
  input: AnonymizeMessageInput
): Promise<AnonymizeMessageOutput> {
  try {
    return await anonymizeMessageFlow(input);
  } catch (error) {
    console.error('Anonymization action failed:', error);
    // On failure, return the original message to avoid blocking the user.
    return {
      anonymizedMessage: input.message,
      anonymized: false,
    };
  }
}
