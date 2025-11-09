'use server';

import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY, { endpoint: "https://router.huggingface.co/hf-inference" });

export interface AnonymizeMessageInput {
  message: string;
}

export interface AnonymizeMessageOutput {
  anonymizedMessage: string;
}

export async function anonymizeMessage(input: AnonymizeMessageInput): Promise<AnonymizeMessageOutput> {
  const prompt = `You are an AI responsible for anonymizing messages by removing or altering identifiable metadata.
Your goal is to protect the user's identity while preserving the message's content and meaning.
Analyze the following message and strip any information that could reveal the sender's identity, location, or other personal details like names, emails, addresses.
Rephrase the message to make it less identifiable. If no personal metadata is detected, return the original message.

Message: "${input.message}"

Anonymized Message:`;

  try {
    const result = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.7,
        return_full_text: false,
      },
    });

    const anonymized = result.generated_text.trim();
    return { anonymizedMessage: anonymized || input.message };

  } catch (error) {
    console.error('Failed to anonymize message with Hugging Face:', error);
    return { anonymizedMessage: input.message };
  }
}
