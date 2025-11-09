'use server';

/**
 * @fileOverview A Genkit flow for generating an anonymous user name.
 *
 * - generateAnonymousName - A function that returns a single anonymous name.
 * - GenerateAnonymousNameOutput - The output type for the generateAnonymousName function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAnonymousNameOutputSchema = z.object({
  name: z.string().describe('A single, creative, anonymous username with a dark, brutal, adult, and sexual humor theme. Examples: DeathJester, CrimsonTemptress, VoidGazer.'),
});
export type GenerateAnonymousNameOutput = z.infer<typeof GenerateAnonymousNameOutputSchema>;


export async function generateAnonymousName(): Promise<GenerateAnonymousNameOutput> {
  return generateAnonymousNameFlow();
}

const generateAnonymousNamePrompt = ai.definePrompt({
  name: 'generateAnonymousNamePrompt',
  output: {schema: GenerateAnonymousNameOutputSchema},
  prompt: `You are an AI that generates creative, anonymous usernames.
  The usernames must be dark, brutal, with adult and sexual humor themes.
  Generate a single username. Do not include any other text or explanation.
  `,
});

const generateAnonymousNameFlow = ai.defineFlow(
  {
    name: 'generateAnonymousNameFlow',
    outputSchema: GenerateAnonymousNameOutputSchema,
  },
  async () => {
    const {output} = await generateAnonymousNamePrompt();
    return output!;
  }
);
