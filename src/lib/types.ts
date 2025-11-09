import { FieldValue } from 'firebase/firestore';

export interface Message {
  id: string;
  text: string;
  encryptedText: string;
  userId: string;
  username: string;
  timestamp: any | FieldValue;
  anonymized: boolean;
  file?: {
    name: string;
    type: string;
    data: string; // base64 encoded
  };
  recipientId: string;
}

export interface UiSettings {
    messageExpiry: number;
    themeColor: 'default' | 'fire' | 'ice' | 'forest' | 'cyberpunk' | 'noir';
    fontSize: 'small' | 'medium' | 'large';
    bubbleStyle: 'rounded' | 'sharp';
    showUsername: boolean;
    animationIntensity: 'low' | 'medium' | 'off';
}
