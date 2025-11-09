import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { configureGenkit } from 'genkit';

configureGenkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const ai = genkit;
