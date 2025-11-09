'use server';

/**
 * @fileOverview A Genkit flow for anonymizing message metadata.
 *
 * - anonymizeMessage - A function that anonymizes the metadata of a given message.
 * - AnonymizeMessageInput - The input type for the anonymizeMessage function.
 * - AnonymizeMessageOutput - The output type for the anonymizeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnonymizeMessageInputSchema = z.object({
  message: z.string().describe('The message to anonymize.'),
});
export type AnonymizeMessageInput = z.infer<typeof AnonymizeMessageInputSchema>;

const AnonymizeMessageOutputSchema = z.object({
  anonymizedMessage: z.string().describe('The message with anonymized metadata.'),
});
export type AnonymizeMessageOutput = z.infer<typeof AnonymizeMessageOutputSchema>;

export async function anonymizeMessage(input: AnonymizeMessageInput): Promise<AnonymizeMessageOutput> {
  return anonymizeMessageFlow(input);
}

const anonymizeMessagePrompt = ai.definePrompt({
  name: 'anonymizeMessagePrompt',
  input: {schema: AnonymizeMessageInputSchema},
  output: {schema: AnonymizeMessageOutputSchema},
  prompt: `You are an AI responsible for anonymizing messages by removing or altering identifiable metadata.
  Your goal is to protect the user's identity while preserving the message's content and meaning.

  Analyze the following message and strip any information that could reveal the sender's identity, location, or other personal details.
  This includes but is not limited to names, email addresses, IP addresses, location data, and unique identifiers.

  Message: {{{message}}}

  Return the anonymized message. If no personal metadata is detected, return the original message.
  Consider also to rephrase the message to make it less identifiable.
  `,
});

const anonymizeMessageFlow = ai.defineFlow(
  {
    name: 'anonymizeMessageFlow',
    inputSchema: AnonymizeMessageInputSchema,
    outputSchema: AnonymizeMessageOutputSchema,
  },
  async input => {
    const {output} = await anonymizeMessagePrompt(input);
    return output!;
  }
);
