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

// Represents the document stored in Firestore
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any | FieldValue;
  anonymized?: boolean;
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
