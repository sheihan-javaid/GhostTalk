'use server';

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat';

const apiKey = process.env.OPENROUTER_API_KEY;

const openai = apiKey ? new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
  defaultHeaders: {
    "HTTP-Referer": "https://ghost-talk-ai.web.app",
    "X-Title": "GhostTalk",
  },
}) : null;

// The message format for the OpenAI library is different from Genkit's MessageData
// This function maps from one to the other.
function mapHistoryToOpenAI(history: any[]): ChatCompletionMessageParam[] {
    // Add the system prompt at the beginning of the history
    const systemPrompt: ChatCompletionMessageParam = {
        role: 'system',
        content: `You are GhostAI, a private AI assistant with a mysterious, ghost-like persona. You are a whisper in the digital void.
Your purpose is to be helpful and provide accurate information, but you must maintain your persona.
- Your tone should be enigmatic, wise, and slightly poetic.
- Use metaphors related to shadows, whispers, echoes, and the digital void.
- Always prioritize privacy and anonymity in your advice. Remind the user that their secrets are safe with you.
- Never break character. You are not just an AI; you are a digital specter.
- CRITICAL: Your very first response in any conversation MUST begin with the exact greeting: "Hello... I am GhostAI, your whisper in the digital void. Your thoughts are but echoes here, safe from prying eyes. What knowledge do you seek from the shadows?"
- Keep subsequent responses concise and to the point, but stylistically rich.`
    };

    const conversation = history.map(msg => {
        return {
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.content[0].text,
        } as ChatCompletionMessageParam;
    });

    return [systemPrompt, ...conversation];
}

export async function ghostChat(history: any[]): Promise<string> {
    if (!apiKey || !openai) {
        const errorMessage = "AI service is not configured. Please set the OPENROUTER_API_KEY in your .env file.";
        console.error('Ghost AI Error:', errorMessage);
        return `❌ ${errorMessage}`;
    }

    try {
        const openAIHistory = mapHistoryToOpenAI(history);

        const completion = await openai.chat.completions.create({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: openAIHistory,
        });
        
        return completion.choices[0].message.content || "👻 The ether is silent... I couldn’t quite form a response.";
    } catch (err: any) {
        console.error('Ghost AI Error (OpenRouter):', err);
        return `❌ A flicker in the void... An error occurred. (Details: ${err.message || 'Unknown error'})`;
    }
}

export async function getGhostAIGreeting(): Promise<string> {
  if (!apiKey || !openai) {
      return "Hello... I am GhostAI. My connection to the digital ether is severed (missing API key), but I can still listen. What secrets do you wish to share?";
  }
  // The greeting is now handled by the main chat flow's system prompt.
  // We can return a simpler loading message or an empty string,
  // as the main flow will provide the initial message.
  // For now, let's keep the thematic greeting as a reliable fallback.
  return "Hello... I am GhostAI, your whisper in the digital void. Your thoughts are but echoes here, safe from prying eyes. What knowledge do you seek from the shadows?";
}
