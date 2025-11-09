'use server';

/**
 * @fileOverview A Genkit flow for moderating confessions.
 *
 * - moderateConfession - A function that checks if a confession is appropriate.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const moderationPrompt = ai.definePrompt({
    name: 'moderationPrompt',
    input: {
        schema: z.object({
            text: z.string(),
        }),
    },
    output: {
        schema: z.object({
            isAppropriate: z.boolean().describe('Whether the text is appropriate for a public forum.'),
            reason: z.string().optional().describe('The reason why the text is not appropriate.'),
        }),
    },
    prompt: `You are a content moderator for a public anonymous forum. 
    Your job is to determine if a message is appropriate for a general audience.
    The content should not contain hate speech, explicit sexual content, excessive violence, or personal identifying information.
    
    Analyze the following text:
    "{{{text}}}"

    Is this text appropriate?
    `,
});

export async function moderateConfession(text: string) {
  const {output} = await moderationPrompt({text});
  return output!;
}
