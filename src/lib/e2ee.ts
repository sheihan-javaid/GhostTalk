'use client';

// This file manages the End-to-End Encryption (E2EE) keys using IndexedDB.

const DB_NAME = 'ghost-talk-e2ee';
const DB_VERSION = 1;
const KEY_STORE_NAME = 'crypto-keys';
const MY_KEY_ID = 'my-key-pair';

interface KeyRecord {
  id: string;
  keyPair: CryptoKeyPair;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function get(id: string): Promise<KeyRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, 'readonly');
    const store = transaction.objectStore(KEY_STORE_NAME);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function set(record: KeyRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(KEY_STORE_NAME);
    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Generates a new ECDH key pair for key agreement.
 */
async function generateKeys(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // The key is exportable
    ['deriveKey']
  );
}

/**
 * Initializes the user's cryptographic keys.
 * If keys don't exist in IndexedDB, it generates and stores them.
 */
export async function initializeKeys(): Promise<void> {
  let myKeys = await get(MY_KEY_ID);
  if (!myKeys) {
    const keyPair = await generateKeys();
    await set({ id: MY_KEY_ID, keyPair });
  }
}

/**
 * Retrieves the user's private key from IndexedDB.
 */
export async function getMyPrivateKey(): Promise<CryptoKey | null> {
  const record = await get(MY_KEY_ID);
  return record ? record.keyPair.privateKey : null;
}

/**
 * Retrieves the user's public key from IndexedDB and exports it as a JWK.
 */
export async function getMyPublicKey(): Promise<JsonWebKey | null> {
  const record = await get(MY_KEY_ID);
  if (record && record.keyPair.publicKey) {
    return await crypto.subtle.exportKey('jwk', record.keyPair.publicKey);
  }
  return null;
}

/**
 * Imports a public key from JWK format into a CryptoKey object.
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
    );
}
