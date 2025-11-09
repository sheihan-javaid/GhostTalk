'use server';

import { genkit, AIMiddleware } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const logger: AIMiddleware = async (req, next) => {
  console.log('Request:', JSON.stringify(req, null, 2));
  try {
    const result = await next(req);
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (e: any) {
    console.log('Error:', e.message);
    throw e;
  }
};

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
  // Log all AI requests and responses to the console.
  // middlewares: [logger],
  logLevel: 'debug',
  // Use a different model for menu generation.
});
