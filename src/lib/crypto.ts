
'use client';

// ============================================================================
// CRYPTO KEY MANAGEMENT
// ============================================================================

interface StoredKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

/**
 * Generate a new ECDH P-256 key pair for the current user
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // Can be exported
    ['deriveKey'] // Private key can be used to derive secret keys
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
    { name: 'ECDH', namedCurve: 'P-256' },
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
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [] // Public keys for ECDH have no key usages
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
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [] // Public keys for ECDH have no key usages
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
        JSON.parse(existing);
        return;
    }
  } catch (e) {
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

/** Helper: ArrayBuffer -> Base64 */
function ab2b64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

/** Helper: Base64 -> ArrayBuffer */
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
  
  // Generate a temporary key pair for this message only
  const ephemeralKeyPair = await generateKeyPair();
  
  // Derive a shared secret using our ephemeral private key and the recipient's public key
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false, // The derived key is not exportable
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
  
  let packaged: EncryptedPackage;
  try {
    const encryptedPackageString = Buffer.from(encryptedPackageB64, 'base64').toString('utf-8');
    packaged = JSON.parse(encryptedPackageString);
  } catch (err) {
    console.error('Failed to parse encrypted package JSON. Data may be corrupted or not valid JSON.');
    throw new Error('Failed to parse encrypted package. It may be corrupted.');
  }
  
  const { ephemPubKey, iv, ct } = packaged;
  if (!ephemPubKey || !ephemPubKey.kty || !iv || !ct) {
    throw new Error('Invalid package structure: missing ephemPubKey, iv, or ct.');
  }

  const senderEphemeralPublicKey = await importPublicKey(ephemPubKey);
  
  // Derive the same shared secret using the sender's ephemeral public key and our private key
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: senderEphemeralPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  try {
    const decryptedAb = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b642ab(iv) },
      sharedSecret,
      b642ab(ct)
    );
    
    const dec = new TextDecoder();
    return dec.decode(decryptedAb);
  } catch (err) {
    console.error('Decryption failed. This is often due to an incorrect key or corrupted data.', err);
    throw new Error('Decryption failed. The message may be corrupted or intended for a different recipient.');
  }
}
