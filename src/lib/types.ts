import { FieldValue } from 'firebase/firestore';

// Represents the decrypted, in-app message object
export interface Message {
  id: string;
  text: string;
  userId: string;
  username: string;
  timestamp: any | FieldValue;
  anonymized: boolean;
  file?: {
    name: string;
    type: string;
    data: string; // base64 encoded
  };
}

// Represents the document stored in a user's `/inbox` subcollection in Firestore
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  encryptedPayload: string; // A JSON.stringified, then encrypted, MessagePayload
  timestamp: any | FieldValue;
  anonymized: boolean;
  expireAt: Date;
}

// Represents the data that gets encrypted inside the `encryptedPayload`
export interface MessagePayload {
    roomId: string;
    text: string;
    file?: {
        name: string;
        type: string;
        data: string; // base64 encoded
    };
}


export interface UiSettings {
    messageExpiry: number;
    themeColor: 'default' | 'fire' | 'ice' | 'forest' | 'cyberpunk' | 'noir';
    fontSize: 'small' | 'medium' | 'large';
    bubbleStyle: 'rounded' | 'sharp';
    showUsername: boolean;
    animationIntensity: 'low' | 'medium' | 'off';
}
