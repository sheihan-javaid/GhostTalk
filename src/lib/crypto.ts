'use client';

// ============================================================================
// CRYPTO KEY MANAGEMENT
// ============================================================================

interface StoredKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

/**
 * Generate a new ECDH key pair for the current user
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  return keyPair;
}

/**
 * Store key pair in localStorage (for demo purposes)
 * In production, store private key more securely
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
    throw new Error('Invalid public key JWK');
  }
  
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
  
  return publicKey;
}

/**
 * Initialize key pair if not exists
 */
export async function initializeKeyPair(): Promise<void> {
  const existing = localStorage.getItem('myKeyPair');
  if (existing) return;
  
  const keyPair = await generateKeyPair();
  await storeMyKeyPair(keyPair);
}

// ============================================================================
// ENCRYPTION / DECRYPTION
// ============================================================================

interface EncryptedPackage {
  ephemPubKey: JsonWebKey;
  iv: string;
  ct: string;
}

/**
 * Helper: ArrayBuffer → Base64
 */
function ab2b64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

/**
 * Helper: Base64 → ArrayBuffer
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
  // Encode text to bytes
  const enc = new TextEncoder();
  const encodedText = enc.encode(text);
  
  // Generate ephemeral key pair for this encryption
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  
  // Derive shared secret using ephemeral private + recipient's public
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false, // Not extractable for security
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the text
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedSecret,
    encodedText
  );
  
  // Export ephemeral public key to share with recipient
  const ephemeralPublicKeyJwk = await crypto.subtle.exportKey(
    'jwk',
    ephemeralKeyPair.publicKey
  );
  
  // Package everything together
  const packaged: EncryptedPackage = {
    ephemPubKey: ephemeralPublicKeyJwk,
    iv: ab2b64(iv),
    ct: ab2b64(ciphertext),
  };
  
  // Convert to JSON string, then Base64 encode the entire package
  const packageString = JSON.stringify(packaged);
  return Buffer.from(packageString, 'utf-8').toString('base64');
}

/**
 * Decrypt an encrypted package using your private key
 * @param encryptedPackageB64 - Base64-encoded encrypted package
 * @returns Decrypted plain text
 */
export async function decrypt(encryptedPackageB64: string): Promise<string> {
  // Validate input
  if (!encryptedPackageB64 || typeof encryptedPackageB64 !== 'string') {
    throw new Error('Invalid encrypted package: must be a non-empty string');
  }
  
  // Get my private key
  const myPrivateKey = await getMyPrivateKey();
  if (!myPrivateKey) {
    throw new Error('Private key not found. Please initialize your key pair first.');
  }
  
  // Base64 decode the package
  let encryptedPackageString: string;
  try {
    encryptedPackageString = Buffer.from(encryptedPackageB64, 'base64').toString('utf-8');
  } catch (err) {
    throw new Error('Failed to decode Base64 package. Data may be corrupted.');
  }
  
  // Parse JSON
  let packaged: EncryptedPackage;
  try {
    packaged = JSON.parse(encryptedPackageString);
  } catch (err) {
    console.error('Failed to parse JSON. Raw data:', encryptedPackageString.substring(0, 100));
    throw new Error('Failed to parse encrypted package. Data may be corrupted or encrypted for wrong key.');
  }
  
  // Validate package structure
  const { ephemPubKey, iv, ct } = packaged;
  if (!ephemPubKey || !ephemPubKey.kty) {
    throw new Error('Invalid ephemeral public key in package');
  }
  if (!iv || !ct) {
    throw new Error('Missing IV or ciphertext in package');
  }
  
  // Decode Base64 components
  let ivAb: ArrayBuffer;
  let ciphertextAb: ArrayBuffer;
  try {
    ivAb = b642ab(iv);
    ciphertextAb = b642ab(ct);
  } catch (err) {
    throw new Error('Failed to decode IV or ciphertext. Data may be corrupted.');
  }
  
  // Import sender's ephemeral public key
  let senderEphemeralPublicKey: CryptoKey;
  try {
    senderEphemeralPublicKey = await crypto.subtle.importKey(
      'jwk',
      ephemPubKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
  } catch (err) {
    throw new Error('Failed to import ephemeral public key');
  }
  
  // Derive shared secret using my private + sender's ephemeral public
  let sharedSecret: CryptoKey;
  try {
    sharedSecret = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: senderEphemeralPublicKey },
      myPrivateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  } catch (err) {
    throw new Error('Failed to derive shared secret. Keys may be incompatible.');
  }
  
  // Decrypt
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
    throw new Error(
      'Decryption failed. The message may be corrupted or encrypted for a different recipient.'
    );
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example usage showing the complete flow
 */
export async function exampleUsage() {
  // 1. Initialize Alice's keys
  await initializeKeyPair();
  const alicePublicKey = await exportMyPublicKey();
  console.log('Alice public key:', alicePublicKey);
  
  // 2. Bob gets Alice's public key and encrypts a message for her
  const alicePublicKeyCrypto = await importPublicKey(alicePublicKey!);
  const encrypted = await encrypt('Hello Alice!', alicePublicKeyCrypto);
  console.log('Encrypted message:', encrypted);
  
  // 3. Alice decrypts the message with her private key
  const decrypted = await decrypt(encrypted);
  console.log('Decrypted message:', decrypted);
}
