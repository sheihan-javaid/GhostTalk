
'use client';

import { getMyPrivateKey } from './e2ee';

// Helper function to convert ArrayBuffer to Base64
function ab2str(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

// Helper function to convert Base64 to ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  return Buffer.from(str, 'base64');
}

/**
 * Encrypts a plaintext message for a recipient using their public key.
 * This uses an ECIES-like approach (Elliptic Curve Integrated Encryption Scheme).
 * 1. Generate a temporary (ephemeral) key pair for this encryption session.
 * 2. Derive a shared secret using our ephemeral private key and the recipient's public key (ECDH).
 * 3. Use the shared secret to derive a symmetric encryption key (AES-GCM).
 * 4. Encrypt the plaintext with the AES-GCM key.
 * 5. Package the ephemeral public key, the IV, and the ciphertext together.
 */
export async function encrypt(text: string, recipientPublicKey: CryptoKey): Promise<string> {
  const textEncoder = new TextEncoder();
  const encodedText = textEncoder.encode(text);

  // 1. Generate ephemeral key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  // 2. Derive shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 3. Encrypt the message
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    sharedSecret,
    encodedText
  );

  // 4. Export ephemeral public key and package everything
  const ephemeralPublicKeyJwk = await crypto.subtle.exportKey('jwk', ephemeralKeyPair.publicKey);
  
  const packaged = {
    ephemPubKey: ephemeralPublicKeyJwk, // Assign the object directly
    iv: ab2str(iv),
    ct: ab2str(ciphertext),
  };

  // The entire package is stringified once here.
  return JSON.stringify(packaged);
}


/**
 * Decrypts a packaged ciphertext using the user's private key and the sender's ephemeral public key.
 * 1. Unpack the ephemeral public key, IV, and ciphertext.
 * 2. Import the ephemeral public key.
 * 3. Derive the same shared secret using our private key and the sender's ephemeral public key.
 * 4. Use the shared secret to derive the symmetric key.
 * 5. Decrypt the ciphertext.
 */
export async function decrypt(encryptedPackage: string): Promise<string> {
  const packaged = JSON.parse(encryptedPackage);
  const myPrivateKey = await getMyPrivateKey();

  if (!myPrivateKey) {
    throw new Error("Private key not found. Cannot decrypt.");
  }
  
  // 1. Unpack
  const { ephemPubKey, iv, ct } = packaged;
  
  if (!ephemPubKey || typeof ephemPubKey !== 'object' || !ephemPubKey.kty) {
    throw new Error("Invalid ephemeral public key in package.");
  }

  const ivAb = str2ab(iv);
  const ciphertextAb = str2ab(ct);

  // 2. Import ephemeral public key
  const senderEphemeralPublicKey = await crypto.subtle.importKey(
    'jwk',
    ephemPubKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  // 3. Derive shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: senderEphemeralPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  // 4. Decrypt
  const decryptedAb = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivAb },
    sharedSecret,
    ciphertextAb
  );

  const textDecoder = new TextDecoder();
  return textDecoder.decode(decryptedAb);
}

