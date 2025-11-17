'use server';
/**
 * @fileoverview A server action that wraps the anonymization flow.
 * This is the only file that should be imported by client components.
 */

import { anonymizeMessageFlow } from './anonymize-message-flow';
import type { AnonymizeMessageInput, AnonymizeMessageOutput } from '@/lib/types';

// Define the main server action that other parts of the app will call.
export async function anonymizeMessage(
  input: AnonymizeMessageInput
): Promise<AnonymizeMessageOutput> {
  try {
    return await anonymizeMessageFlow(input);
  } catch (error) {
    console.error('Anonymization action failed:', error);
    // On failure, return the original message to avoid blocking the user.
    return {
      anonymizedMessage: input.message,
      anonymized: false,
    };
  }
}

    