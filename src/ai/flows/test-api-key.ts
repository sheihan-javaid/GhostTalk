'use server';

import { ai } from '@/ai/genkit';
import { generate } from 'genkit';

export async function testApiKey(): Promise<string> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return 'Error: Missing GOOGLE_API_KEY in the .env file.';
    }

    const { text } = await generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: "Hello! If you can see this, respond with a single word: 'Success!'",
    });
    
    return `Success! API Response: "${text}"`;
    
  } catch (err: any) {
    console.error('API Key Test Error:', err);
    return `Error: The API call failed.
---
Message: ${err.message}
---
This usually means the API key is invalid, the API is not enabled in your Google Cloud project for "generativeai.googleapis.com", or billing is not enabled for the project.`;
  }
}
