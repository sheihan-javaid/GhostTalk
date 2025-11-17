'use server';
/**
 * @fileoverview This file initializes the Genkit AI instance with the Google AI plugin.
 * It sets up the core AI functionality for the application.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the Genkit AI instance.
// The `googleAI()` plugin configures Genkit to use Google's generative AI models (e.g., Gemini).
// The API key is automatically sourced from the `GEMINI_API_KEY` environment variable.
export const ai = genkit({
  plugins: [googleAI()],
});
