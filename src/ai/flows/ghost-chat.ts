'use server';

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

const apiKey = process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
}) : null;

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
    if (!apiKey || !openai) {
        const errorMessage = "AI service is not configured. Please set the OPENAI_API_KEY in your .env file.";
        console.error('Ghost AI Error:', errorMessage);
        return `❌ ${errorMessage}`;
    }

    try {
        const openAIHistory = mapHistoryToOpenAI(history);

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: openAIHistory,
        });
        
        return completion.choices[0].message.content || "👻 I’m GhostAI — but I couldn’t quite catch that.";
    } catch (err: any) {
        console.error('Ghost AI Error (OpenAI):', err);
        return '❌ An error occurred while communicating with the AI. Please check the server console for details.';
    }
}

export async function getGhostAIGreeting(): Promise<string> {
  if (!apiKey || !openai) {
      return "Hello! 👋 I’m GhostAI. My AI capabilities are currently offline as I'm missing an API key, but I'm here to chat. What's on your mind?";
  }
  return "Hello! 👋 I’m GhostAI, your whisper in the digital void. I'm here to help you with questions, creative projects, coding, analysis, and much more without leaving any traces. What can I help you with today?";
}
