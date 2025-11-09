'use client';

import { getMyPrivateKey } from './e2ee';

// Helper: ArrayBuffer → Base64
function ab2b64(buf: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Base64 → ArrayBuffer
function b642ab(b64: string) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encrypt(text: string, recipientPublicKey: CryptoKey) {
  const enc = new TextEncoder();
  const encodedText = enc.encode(text);

  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedSecret,
    encodedText
  );

  const ephemeralPublicKeyJwk = await crypto.subtle.exportKey('jwk', ephemeralKeyPair.publicKey);

  const packaged = {
    ephemPubKey: ephemeralPublicKeyJwk,
    iv: ab2b64(iv),
    ct: ab2b64(ciphertext),
  };

  // Return a plain string, not binary
  return btoa(JSON.stringify(packaged));
}

export async function decrypt(encryptedPackageB64: string) {
  const myPrivateKey = await getMyPrivateKey();
  if (!myPrivateKey) throw new Error("Private key not found.");

  // Decode Base64 to JSON string
  const jsonStr = atob(encryptedPackageB64);
  let packaged;
  try {
    packaged = JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse JSON:", err, jsonStr.slice(0, 50));
    throw new Error("Corrupted message — not valid JSON.");
  }

  const { ephemPubKey, iv, ct } = packaged;

  const ivAb = b642ab(iv);
  const ciphertextAb = b642ab(ct);

  const senderEphemeralPublicKey = await crypto.subtle.importKey(
    'jwk',
    ephemPubKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: senderEphemeralPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  try {
    const decryptedAb = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivAb },
      sharedSecret,
      ciphertextAb
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedAb);
  } catch (err) {
    console.error("Decryption failed:", err);
    throw new Error("Decryption failed — corrupted or wrong key.");
  }
}
