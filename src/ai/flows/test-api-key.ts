'use server';

import { HfInference } from '@huggingface/inference';

export async function testApiKey(): Promise<string> {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      return 'Error: Missing HUGGINGFACE_API_KEY in the .env file.';
    }

    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY, { endpoint: "https://router.huggingface.co/hf-inference" });

    const model = 'mistralai/Mistral-7B-Instruct-v0.2';
    const response = await hf.textGeneration({
      model: model,
      inputs: "Hello! If you can see this, respond with a single word: 'Success!'",
      parameters: { max_new_tokens: 10 }
    });
    
    return `Success! API Response for model ${model}: "${response.generated_text}"`;
    
  } catch (err: any) {
    console.error('API Key Test Error (Hugging Face):', err);
    return `Error: The API call failed.
---
Message: ${err.message}
---
This usually means the Hugging Face API key is invalid or does not have the correct permissions.`;
  }
}
