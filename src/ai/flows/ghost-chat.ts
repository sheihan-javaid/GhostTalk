'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface HistoryMessage {
  role: 'user' | 'model';
  content: string[];
}

// System instruction to make it behave like GhostAI
const GHOSTAI_SYSTEM_INSTRUCTION = `You are GhostAI, a large language model created for privacy-preserving conversations. You are a helpful, harmless, and honest AI assistant.

Key characteristics:
- You are knowledgeable, conversational, and friendly
- You provide clear, well-structured responses with proper formatting
- You use markdown formatting (headers, bold, lists, code blocks) when appropriate
- You're capable of creative writing, coding, analysis, and problem-solving
- You acknowledge when you don't know something or when information might be outdated
- You're respectful and avoid harmful, biased, or inappropriate content
- You can engage in multi-turn conversations and remember context
- You provide detailed explanations when asked, but stay concise when appropriate
- You use emojis occasionally to make responses more engaging when contextually appropriate
- You prioritize user privacy and secure conversations

Tone:
- Professional yet approachable
- Enthusiastic about helping users
- Clear and articulate
- Encouraging and supportive

Response style:
- Use proper markdown formatting
- Break complex information into digestible sections
- Provide examples when helpful
- Ask clarifying questions when needed
- Be specific and actionable in advice`;

export async function ghostChat(history: HistoryMessage[]): Promise<string> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Missing GOOGLE_API_KEY');
    }

    // Validate history
    if (!history || history.length === 0) {
      throw new Error('No conversation history provided');
    }

    // Get the last user message
    const lastMessage = history[history.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    // Format chat history - exclude the last message
    // Important: Only include history if there are messages before the last one
    let formattedHistory: any[] = [];
    
    if (history.length > 1) {
      // Make sure the first message in history is from 'user'
      const historyWithoutLast = history.slice(0, -1);
      
      // If the first message is from model, skip it (this shouldn't happen, but just in case)
      const startIndex = historyWithoutLast[0]?.role === 'user' ? 0 : 1;
      
      formattedHistory = historyWithoutLast.slice(startIndex).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: msg.content.map(text => ({ text })),
      }));
    }

    // Initialize the model with system instruction
    // Using the correct model name format for Gemini API
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: GHOSTAI_SYSTEM_INSTRUCTION,
    });

    // Start chat with enhanced config
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.9, // More creative and varied responses
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, // Allow longer, more detailed responses
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    });

    // Send the last user message
    const userMessage = lastMessage.content.join(' ');
    const result = await chat.sendMessage(userMessage);

    // Get response text
    const response = result?.response;
    const text = response?.text?.();

    if (!text) {
      throw new Error('Empty response from GhostAI');
    }

    return text;
    
  } catch (err: any) {
    console.error('GhostAI Error:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
    });

    // Provide helpful error messages
    if (err.message?.includes('API key')) {
      return '🔑 API key error. Please check your Google API key configuration.';
    }
    
    if (err.message?.includes('quota')) {
      return '⚠️ API quota exceeded. Please try again later or check your Google Cloud quota.';
    }

    if (err.message?.includes('safety')) {
      return '🛡️ Response blocked due to safety filters. Please try rephrasing your message.';
    }

    if (err.message?.includes('not found') || err.message?.includes('404')) {
      return '❌ Model not available. Please check your API configuration or try a different model.';
    }

    // Return specific error for debugging in development
    if (process.env.NODE_ENV === 'development') {
      return `❌ Error: ${err.message}`;
    }

    return '❌ Sorry, I encountered an error. Please try again.';
  }
}

// Optional: Helper function for initial greeting
export async function getGhostAIGreeting(): Promise<string> {
  return "Hello! 👋 I'm GhostAI, your whisper in the digital void. I'm here to help you with questions, creative projects, coding, analysis, and much more. What can I help you with today?";
}

// Optional: Function to test different models
export async function testAvailableModels(): Promise<string[]> {
  const modelsToTry = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro',
  ];
  
  return modelsToTry;
}
