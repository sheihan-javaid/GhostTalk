'use client';

// This file is now a proxy for the crypto.ts functions.
// All logic has been centralized in crypto.ts.

export {
  initializeKeyPair,
  getMyPublicKey,
  importPublicKey,
} from './crypto';
