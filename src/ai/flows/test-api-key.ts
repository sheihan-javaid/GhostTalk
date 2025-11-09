'use server';

import OpenAI from 'openai';

export async function testApiKey(): Promise<string> {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return 'Error: Missing OPENROUTER_API_KEY in the .env file.';
    }

    const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [
        { role: 'user', content: "Hello! If you can see this, respond with a single word: 'Success!'" },
      ],
    });

    const response = completion.choices[0].message.content;
    
    return `Success! API Response from OpenRouter (mistral-7b-instruct): "${response}"`;
    
  } catch (err: any) {
    console.error('API Key Test Error (OpenRouter):', err);
    let errorMessage = `Error: The API call to OpenRouter failed.
---
Message: ${err.message}
---
This usually means your OpenRouter API key is invalid or has insufficient credits.`;
    
    if (err.status === 401) {
        errorMessage += '\n\nIt looks like an authentication error (401). Please double-check your API key in the .env file.';
    }
    
    return errorMessage;
  }
}
