import { FieldValue } from 'firebase/firestore';

// Represents the decrypted, in-app message object
export interface Message {
  id: string;
  text: string;
  userId: string;
  username: string;
  timestamp: any | FieldValue;
  anonymized: boolean;
}

// Represents the document stored in Firestore
export interface ChatMessage {
  senderId: string;
  senderName: string;
  encryptedPayload: string;
  timestamp: any | FieldValue;
  anonymized?: boolean;
}


export interface UiSettings {
    messageExpiry: number;
    themeColor: 'default' | 'fire' | 'ice' | 'forest' | 'cyberpunk' | 'noir';
    fontSize: 'small' | 'medium' | 'large';
    bubbleStyle: 'rounded' | 'sharp';
    showUsername: boolean;
    animationIntensity: 'low' | 'medium' | 'off';
}
