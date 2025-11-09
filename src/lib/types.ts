export interface Message {
  id: string;
  text: string;
  encryptedText: string;
  userId: string;
  username: string;
  timestamp: number;
  anonymized: boolean;
  file?: {
    name: string;
    type: string;
    data: string; // base64 encoded
  };
}

export interface UiSettings {
    messageExpiry: number;
    themeColor: 'default' | 'fire' | 'ice';
    fontSize: 'small' | 'medium' | 'large';
    bubbleStyle: 'rounded' | 'sharp';
    showUsername: boolean;
    animationIntensity: 'low' | 'medium' | 'off';
}
