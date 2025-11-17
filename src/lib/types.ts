import { FieldValue } from 'firebase/firestore';
import { z } from 'zod';

// The decrypted payload of a message. Can contain text and/or media.
export interface MessagePayload {
  text: string;
  media?: string; // data URL for images
}

// Represents the decrypted, in-app message object
export interface Message {
  id: string;
  text: string;
  media?: string;
  userId: string;
  username: string;
  timestamp: any | FieldValue;
  anonymized: boolean;
  isEdited?: boolean;
}

// Represents the document stored in Firestore
export interface ChatMessage {
  senderId: string;
  senderName: string;
  payloads: { [key: string]: string }; // A map of encrypted payloads, one for each user
  timestamp: any | FieldValue;
  anonymized?: boolean;
  isEdited?: boolean;
}


export interface UiSettings {
    messageExpiry: number;
    themeColor: 'default' | 'fire' | 'ice' | 'forest' | 'cyberpunk' | 'noir';
    fontSize: 'small' | 'medium' | 'large';
    bubbleStyle: 'rounded' | 'sharp';
    animationIntensity: 'low' | 'medium' | 'off';
}

// AI Flow Types

// Define the schema for the input, which is just the message text.
export const AnonymizeMessageInputSchema = z.object({
  message: z.string().describe('The text of the message to be anonymized.'),
});
export type AnonymizeMessageInput = z.infer<typeof AnonymizeMessageInputSchema>;


// Define the schema for the structured output we expect from the AI.
export const AnonymizeMessageOutputSchema = z.object({
  anonymizedMessage: z
    .string()
    .describe(
      'The processed message. This will be the original message if no PII is found, or the altered message if PII was removed.'
    ),
  anonymized: z
    .boolean()
    .describe(
      'A boolean flag indicating whether the message was altered. True if PII was detected and removed, false otherwise.'
    ),
});
export type AnonymizeMessageOutput = z.infer<typeof AnonymizeMessageOutputSchema>;
