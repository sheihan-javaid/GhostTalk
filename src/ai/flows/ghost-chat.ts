'use server';

import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

interface ChatMessage {
  role: 'user' | 'model';
  content: string[];
}

export async function ghostChat(history: ChatMessage[]): Promise<string> {
  const modelId = "mistralai/Mistral-7B-Instruct-v0.2";

  try {
    const hfHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
        content: msg.content[0]
    }));

    const response = await hf.chatCompletion({
      model: modelId,
      messages: hfHistory,
      max_tokens: 512,
      temperature: 0.8,
    });

    return response.choices[0].message.content || "👻 I’m GhostAI — but I couldn’t quite catch that.";
  } catch (err: any) {
    console.error('Ghost AI Error (Hugging Face):', err);
    return '❌ An error occurred. Please check the server console for details.';
  }
}

export async function getGhostAIGreeting(): Promise<string> {
  return "👻 Hey, I’m GhostAI — your privacy-first chat that vanishes like a whisper. What’s on your mind?";
}
