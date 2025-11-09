// hooks/use-file-encryption.ts
import { useCallback } from 'react';
import { useToast } from './use-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function useFileEncryption() {
  const { toast } = useToast();

  const encryptFile = useCallback(async (file: File): Promise<string> => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File is too large. Maximum size is 5MB.');
    }

    // This is a simulation. In a real app, use Web Crypto API for encryption.
    // For now, we just convert it to a base64 data URL.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }, [toast]);

  const decryptFile = useCallback(async (data: string, type: string): Promise<File> => {
    // This is a simulation. In a real app, use Web Crypto API for decryption.
    const res = await fetch(data);
    const blob = await res.blob();
    return new File([blob], 'decrypted-file', { type });
  }, []);

  return { encryptFile, decryptFile };
}
