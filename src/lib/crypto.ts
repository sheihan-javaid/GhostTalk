'use client';

// ============================================================================
// CRYPTO KEY MANAGEMENT
// ============================================================================

interface StoredKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

/**
 * Generate a new X25519 key pair for the current user
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'X25519' },
    true,
    ['deriveKey']
  );
  return keyPair;
}

/**
 * Store key pair in localStorage (for demo purposes)
 */
export async function storeMyKeyPair(keyPair: CryptoKeyPair): Promise<void> {
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  
  const stored: StoredKeyPair = {
    publicKey: publicKeyJwk,
    privateKey: privateKeyJwk,
  };
  
  localStorage.setItem('myKeyPair', JSON.stringify(stored));
}

/**
 * Get my private key from storage
 */
export async function getMyPrivateKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem('myKeyPair');
  if (!stored) return null;
  
  const parsed: StoredKeyPair = JSON.parse(stored);
  
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    parsed.privateKey,
    { name: 'X25519' },
    true,
    ['deriveKey']
  );
  
  return privateKey;
}

/**
 * Get my public key from storage
 */
export async function getMyPublicKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem('myKeyPair');
  if (!stored) return null;
  
  const parsed: StoredKeyPair = JSON.parse(stored);
  
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    parsed.publicKey,
    { name: 'X25519' },
    true,
    []
  );
  
  return publicKey;
}

/**
 * Export my public key as JWK (to share with others)
 */
export async function exportMyPublicKey(): Promise<JsonWebKey | null> {
  const stored = localStorage.getItem('myKeyPair');
  if (!stored) return null;
  
  const parsed: StoredKeyPair = JSON.parse(stored);
  return parsed.publicKey;
}

/**
 * Import someone else's public key from JWK
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  if (!jwk || !jwk.kty) {
    throw new Error('Invalid public key JWK: Missing key type property.');
  }
  
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'X25519' },
    true,
    [] // A public key for X25519 is not used for derivation itself, so usages can be empty.
  );
  
  return publicKey;
}

/**
 * Initialize key pair if not exists
 */
export async function initializeKeyPair(): Promise<void> {
  try {
    const existing = localStorage.getItem('myKeyPair');
    if (existing) {
        // Optional: Validate the existing key pair format
        JSON.parse(existing);
        return;
    }
  } catch (e) {
      // Corrupted key in storage, will proceed to generate a new one
      console.warn("Could not parse existing key pair, generating new one.", e);
  }
  
  const keyPair = await generateKeyPair();
  await storeMyKeyPair(keyPair);
}

// ============================================================================
// ENCRYPTION / DECRYPTION
// ============================================================================

interface EncryptedPackage {
  ephemPubKey: JsonWebKey;
  iv: string; // Base64
  ct: string; // Base64
}

/**
 * Helper: ArrayBuffer -> Base64
 */
function ab2b64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

/**
 * Helper: Base64 -> ArrayBuffer
 */
function b642ab(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Encrypt text for a recipient's public key
 * @param text - Plain text to encrypt
 * @param recipientPublicKey - The recipient's public CryptoKey
 * @returns Base64-encoded encrypted package
 */
export async function encrypt(
  text: string,
  recipientPublicKey: CryptoKey
): Promise<string> {
  const enc = new TextEncoder();
  const encodedText = enc.encode(text);
  
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'X25519' },
    true,
    ['deriveKey']
  );
  
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'X25519', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false, // Not extractable
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedSecret,
    encodedText
  );
  
  const ephemeralPublicKeyJwk = await crypto.subtle.exportKey(
    'jwk',
    ephemeralKeyPair.publicKey
  );
  
  const packaged: EncryptedPackage = {
    ephemPubKey: ephemeralPublicKeyJwk,
    iv: ab2b64(iv),
    ct: ab2b64(ciphertext),
  };
  
  const packageString = JSON.stringify(packaged);
  return Buffer.from(packageString, 'utf-8').toString('base64');
}

/**
 * Decrypt an encrypted package using your private key
 * @param encryptedPackageB64 - Base64-encoded encrypted package
 * @returns Decrypted plain text
 */
export async function decrypt(encryptedPackageB64: string): Promise<string> {
  if (!encryptedPackageB64 || typeof encryptedPackageB64 !== 'string') {
    throw new Error('Invalid encrypted package: must be a non-empty string.');
  }
  
  const myPrivateKey = await getMyPrivateKey();
  if (!myPrivateKey) {
    throw new Error('Private key not found. Please initialize your key pair first.');
  }
  
  let encryptedPackageString: string;
  try {
    encryptedPackageString = Buffer.from(encryptedPackageB64, 'base64').toString('utf-8');
  } catch (err) {
    throw new Error('Failed to decode Base64 package. Data may be corrupted.');
  }
  
  let packaged: EncryptedPackage;
  try {
    packaged = JSON.parse(encryptedPackageString);
  } catch (err) {
    console.error('Failed to parse JSON. Raw data:', encryptedPackageString.substring(0, 100));
    throw new Error('Failed to parse encrypted package JSON. Data may be corrupted or encrypted for wrong key.');
  }
  
  const { ephemPubKey, iv, ct } = packaged;
  if (!ephemPubKey || typeof ephemPubKey !== 'object' || !ephemPubKey.kty || !iv || !ct) {
    throw new Error('Invalid package structure: missing or malformed ephemPubKey, iv, or ct.');
  }
  
  let ivAb: ArrayBuffer;
  let ciphertextAb: ArrayBuffer;
  try {
    ivAb = b642ab(iv);
    ciphertextAb = b642ab(ct);
  } catch (err) {
    throw new Error('Failed to decode IV or ciphertext from Base64. Data may be corrupted.');
  }
  
  const senderEphemeralPublicKey = await importPublicKey(ephemPubKey);
  
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'X25519', public: senderEphemeralPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
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
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed. The message may be corrupted or intended for a different recipient.');
  }
}
