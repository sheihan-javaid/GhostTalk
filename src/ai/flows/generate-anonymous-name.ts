'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface GenerateAnonymousNameOutput {
  name: string;
}

export async function generateAnonymousName(): Promise<GenerateAnonymousNameOutput> {
  const prompt = `You are an AI that generates creative, anonymous usernames.
  The usernames must be dark, brutal, with adult and sexual humor themes.
  Generate a single username. Do not include any other text or explanation.
  Return the name as a JSON object with a single key "name".
  Example: {"name": "VoidGazer"}
  `;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(text);
    return { name: parsed.name || 'Anonymous' };
  } catch (error) {
    console.error('Failed to generate anonymous name:', error);
    return { name: 'Anonymous' + Math.floor(Math.random() * 1000) };
  }
}
