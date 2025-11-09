'use server';

import { ai } from '@/ai/genkit';
import { generate } from 'genkit/ai';
import { z } from 'zod';

const ModerationInputSchema = z.object({
  text: z.string(),
});

const ModerationResponseSchema = z.object({
  isAppropriate: z.boolean().describe('Whether the text is appropriate.'),
  reason: z.string().optional().describe('The reason if the text is not appropriate.'),
});

const moderationPrompt = ai.definePrompt({
    name: 'moderationPrompt',
    input: { schema: ModerationInputSchema },
    output: { schema: ModerationResponseSchema },
    prompt: `You are a content moderator. Your task is to determine if the following text is appropriate. 
    The content should not contain hate speech, harassment, or explicit content.
    Text: "{{text}}"`,
    model: 'gemini-pro',
});

export async function moderateConfession(text: string): Promise<{ isAppropriate: boolean; reason?: string; }> {
  try {
    if (!text.trim()) {
        return { isAppropriate: true };
    }
    const response = await moderationPrompt({text});
    return response.output!;
  } catch (error) {
    console.error('Failed to moderate confession with Genkit:', error);
    return {
      isAppropriate: false,
      reason: 'Could not be analyzed by the moderator.',
    };
  }
}
