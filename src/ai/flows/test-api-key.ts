'use server';

import { ai } from '@/ai/genkit';

export async function testApiKey(): Promise<string> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return 'Error: Missing GOOGLE_API_KEY in the .env file.';
    }

    const response = await ai.generate({
      model: 'gemini-pro',
      prompt: "Hello! If you can see this, respond with a single word: 'Success!'",
    });
    
    return `Success! API Response for model gemini-pro: "${response.text}"`;
    
  } catch (err: any) {
    console.error('API Key Test Error (Genkit):', err);
    let errorMessage = `Error: The API call failed.
---
Message: ${err.message}
---
This usually means the API key is invalid, has restrictions, or the API is not enabled in your Google Cloud project for "generativeai.googleapis.com".`;
    
    if (err.message.includes('permission denied')) {
        errorMessage += '\n\nIt looks like a "permission denied" error. Please ensure billing is enabled for your Google Cloud project.';
    }
    
    return errorMessage;
  }
}
