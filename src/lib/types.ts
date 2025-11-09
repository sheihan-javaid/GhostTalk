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
