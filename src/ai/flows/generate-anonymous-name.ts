'use server';

import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY, { endpoint: "https://api-inference.huggingface.co/models" });

export interface GenerateAnonymousNameOutput {
  name: string;
}

export async function generateAnonymousName(): Promise<GenerateAnonymousNameOutput> {
  const prompt = `Generate one creative, anonymous username. The username should be dark, brutal, or have adult humor themes.
Return only the username, with no explanation or extra text.
Example: VoidGazer
Username:`;
  try {
    const result = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 10,
        temperature: 1.2,
        return_full_text: false,
      },
    });
    
    // Clean up response to get just the name
    const name = result.generated_text.trim().split('\n')[0].replace(/"/g, '');
    return { name: name || 'Anonymous' };
  } catch (error) {
    console.error('Failed to generate anonymous name with Hugging Face:', error);
    return { name: 'Anonymous' + Math.floor(Math.random() * 1000) };
  }
}
