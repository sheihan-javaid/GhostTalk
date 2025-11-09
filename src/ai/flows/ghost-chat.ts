'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface ChatMessage {
  role: 'user' | 'model';
  content: string[];
}

/**
 * Ensures the chat history alternates between 'user' and 'model' roles,
 * starting with a 'user' role. This is a requirement for the Gemini API.
 */
function formatAndValidateHistory(history: ChatMessage[]) {
    const validatedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    let lastRole: 'user' | 'model' | null = null;

    // Find the first user message and start from there
    const firstUserIndex = history.findIndex(msg => msg.role === 'user');
    if (firstUserIndex === -1) {
        // If there are no user messages, we can't send anything.
        // This might happen if history only contains a greeting.
        // Send only the last message if it's from the user.
        const lastMessage = history[history.length -1];
        if (lastMessage && lastMessage.role === 'user') {
            return [
                {
                    role: 'user',
                    parts: lastMessage.content.map(text => ({ text }))
                }
            ];
        }
        return [];
    }

    const processableHistory = history.slice(firstUserIndex);

    for (const msg of processableHistory) {
        if (msg.role !== lastRole) {
            validatedHistory.push({
                role: msg.role,
                parts: msg.content.map(text => ({ text }))
            });
            lastRole = msg.role;
        } else {
            // If the role is the same as the last one, merge the content.
            // This handles cases like [user, user] by combining them.
            const lastEntry = validatedHistory[validatedHistory.length - 1];
            const newParts = msg.content.map(text => ({ text }));
            lastEntry.parts.push(...newParts);
        }
    }
    return validatedHistory;
}


export async function ghostChat(history: ChatMessage[]): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Format and validate the history before sending
    const formattedHistory = formatAndValidateHistory(history);

    if (formattedHistory.length === 0) {
      return "I need a message from you to get started!";
    }

    const result = await model.generateContent({
      contents: formattedHistory,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 512,
      },
    });

    const text = result.response.text();

    return text || "👻 I’m GhostAI — but I couldn’t quite catch that.";
  } catch (err: any) {
    console.error('Ghost AI Error:', err instanceof Error ? err.message : err);
    console.error(err);
    return '❌ An error occurred. Please check the server console for details.';
  }
}

export async function getGhostAIGreeting(): Promise<string> {
  return "👻 Hey, I’m GhostAI — your privacy-first chat that vanishes like a whisper. What’s on your mind?";
}
