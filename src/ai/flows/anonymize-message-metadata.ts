'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface AnonymizeMessageInput {
  message: string;
}

export interface AnonymizeMessageOutput {
  anonymizedMessage: string;
}

export async function anonymizeMessage(input: AnonymizeMessageInput): Promise<AnonymizeMessageOutput> {
  const prompt = `You are an AI responsible for anonymizing messages by removing or altering identifiable metadata.
  Your goal is to protect the user's identity while preserving the message's content and meaning.

  Analyze the following message and strip any information that could reveal the sender's identity, location, or other personal details.
  This includes but is not limited to names, email addresses, IP addresses, location data, and unique identifiers.

  Message: ${input.message}

  Return only the anonymized message as a JSON object with a single key "anonymizedMessage". If no personal metadata is detected, return the original message.
  Consider also to rephrase the message to make it less identifiable.
  Example response for "My name is John and I live at 123 Main St.": {"anonymizedMessage": "Someone mentioned they live on a main street."}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // In a real scenario, you'd want more robust parsing
    const parsed = JSON.parse(text);
    return { anonymizedMessage: parsed.anonymizedMessage || input.message };
  } catch (error) {
    console.error('Failed to anonymize message:', error);
    // Fallback to original message on error
    return { anonymizedMessage: input.message };
  }
}
