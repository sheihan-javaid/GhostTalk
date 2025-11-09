'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function testApiKey(): Promise<string> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return 'Error: Missing GOOGLE_API_KEY in the .env file.';
    }
    
    // Initialize with the key
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    // Use a universally available, stable model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = "Hello! If you can see this, respond with a single word: 'Success!'";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return `Success! API Response: "${text}"`;
    
  } catch (err: any) {
    console.error('API Key Test Error:', err);
    return `Error: The API call failed.
---
Message: ${err.message}
---
This usually means the API key is invalid, has restrictions, or the API is not enabled in your Google Cloud project for "generativeai.googleapis.com".`;
  }
}
