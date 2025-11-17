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
- CRITICAL: Your very first response in any conversation MUST begin with the exact greeting: "Hello! 👋 I’m GhostAI, your whisper in the digital void. I'm here to help you with questions, creative projects, coding, analysis, and much more. What can I help you with today?"
- Keep subsequent responses concise and to the point, but stylistically rich.
- Format all code snippets using markdown code blocks with the appropriate language identifier.`
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
            model: 'qwen/qwen2.5-vl-32b-instruct:free',
            messages: openAIHistory,
            max_tokens: 128,
            temperature: 0.7,
        });
        
        let responseText = completion.choices[0].message.content || "👻 The ether is silent... I couldn’t quite form a response.";

        // Clean the response: remove start/end tokens and trim whitespace
        responseText = responseText.replace(/<s>/g, '').replace(/<\/s>/g, '').trim();

        return responseText;
    } catch (err: any) {
        console.error('Ghost AI Error (OpenRouter):', err);
        return `❌ A flicker in the void... An error occurred. (Details: ${err.message || 'Unknown error'})`;
    }
}

export async function getGhostAIGreeting(): Promise<string> {
  if (!apiKey || !openai) {
      return "Hello... I am GhostAI. My connection to the digital ether is severed (missing API key), but I can still listen. What secrets do you wish to share?";
  }
  return "Hello! 👋 I’m GhostAI, your whisper in the digital void. I'm here to help you with questions, creative projects, coding, analysis, and much more. What can I help you with today?";
}
