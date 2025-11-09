'use client';

import { getMyPrivateKey } from './e2ee';

// Helper function to convert ArrayBuffer to Base64
function ab2str(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

// Helper function to convert Base64 to ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  const buf = Buffer.from(str, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Encrypts a plaintext message for a recipient using their public key.
 * This uses an ECIES-like approach (Elliptic Curve Integrated Encryption Scheme).
 * 1. Generate a temporary (ephemeral) key pair for this encryption session.
 * 2. Derive a shared secret using our ephemeral private key and the recipient's public key (ECDH).
 * 3. Use the shared secret to derive a symmetric encryption key (AES-GCM).
 * 4. Encrypt the plaintext with the AES-GCM key.
 * 5. Package the ephemeral public key, the IV, and the ciphertext together.
 * 6. CRITICAL: Base64-encode the entire JSON package to prevent corruption.
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
    ephemPubKey: ephemeralPublicKeyJwk,
    iv: ab2str(iv),
    ct: ab2str(ciphertext),
  };

  // 5. Stringify the package and then Base64 encode it for safe transport.
  const packageString = JSON.stringify(packaged);
  return Buffer.from(packageString).toString('base64');
}


/**
 * Decrypts a packaged ciphertext using the user's private key.
 * 1. CRITICAL: Base64-decode the incoming package string.
 * 2. Unpack the ephemeral public key, IV, and ciphertext.
 * 3. Import the ephemeral public key.
 * 4. Derive the same shared secret using our private key and the sender's ephemeral public key.
 * 5. Use the shared secret to derive the symmetric key.
 * 6. Decrypt the ciphertext.
 */
export async function decrypt(encryptedPackageB64: string): Promise<string> {
  // 1. Base64-decode the incoming string to get the original JSON string.
  const encryptedPackageString = Buffer.from(encryptedPackageB64, 'base64').toString('utf-8');
  const packaged = JSON.parse(encryptedPackageString);
  
  const myPrivateKey = await getMyPrivateKey();

  if (!myPrivateKey) {
    throw new Error("Private key not found. Cannot decrypt.");
  }
  
  // 2. Unpack
  const { ephemPubKey, iv, ct } = packaged;
  
  if (!ephemPubKey || typeof ephemPubKey !== 'object' || !ephemPubKey.kty) {
    throw new Error("Invalid ephemeral public key in package.");
  }

  const ivAb = str2ab(iv);
  const ciphertextAb = str2ab(ct);

  // 3. Import ephemeral public key
  const senderEphemeralPublicKey = await crypto.subtle.importKey(
    'jwk',
    ephemPubKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  // 4. Derive shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: senderEphemeralPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  // 5. Decrypt
  try {
    const decryptedAb = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivAb },
      sharedSecret,
      ciphertextAb
    );

    const textDecoder = new TextDecoder();
    return textDecoder.decode(decryptedAb);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt message. The key may be incorrect or the data corrupted.");
  }
}
