'use client';

import { getMyPrivateKey } from './e2ee';

// Helper: ArrayBuffer → Base64
function ab2b64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

// Helper: Base64 → ArrayBuffer
function b642ab(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, 'base64');
  // This slice is important to create a new ArrayBuffer of the correct size
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export async function encrypt(text: string, recipientPublicKey: CryptoKey): Promise<string> {
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
  
  const packageString = JSON.stringify(packaged);
  // Final Base64 encoding of the entire package to ensure integrity
  return Buffer.from(packageString).toString('base64');
}

export async function decrypt(encryptedPackageB64: string): Promise<string> {
  // 1. Base64-decode the incoming string to get the original JSON string.
  const encryptedPackageString = Buffer.from(encryptedPackageB64, 'base64').toString('utf-8');
  const packaged = JSON.parse(encryptedPackageString);
  
  const myPrivateKey = await getMyPrivateKey();
  if (!myPrivateKey) throw new Error("Private key not found.");

  const { ephemPubKey, iv, ct } = packaged;

  if (!ephemPubKey || typeof ephemPubKey !== 'object' || !ephemPubKey.kty) {
    throw new Error("Invalid ephemeral public key in package.");
  }
  
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
