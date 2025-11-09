'use server';

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// The message format for the OpenAI library is different from Genkit's MessageData
// This function maps from one to the other.
function mapHistoryToOpenAI(history: any[]): ChatCompletionMessageParam[] {
    return history.map(msg => {
        return {
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.content[0].text,
        };
    });
}

export async function ghostChat(history: any[]): Promise<string> {
    try {
        const openAIHistory = mapHistoryToOpenAI(history);

        const completion = await openai.chat.completions.create({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: openAIHistory,
        });
        
        return completion.choices[0].message.content || "👻 I’m GhostAI — but I couldn’t quite catch that.";
    } catch (err: any) {
        console.error('Ghost AI Error (OpenRouter):', err);
        return '❌ An error occurred. Please check the server console for details.';
    }
}

export async function getGhostAIGreeting(): Promise<string> {
  return "Hello! 👋 I’m GhostAI, your whisper in the digital void. I'm here to help you with questions, creative projects, coding, analysis, and much more without leaving any traces. What can I help you with today?";
}
