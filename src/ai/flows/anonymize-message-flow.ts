'use server';

import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

/**
 * Redacts Personally Identifiable Information (PII) from a given text using regular expressions.
 * This is a deterministic and local approach, avoiding external API calls.
 * @param text The input string to sanitize.
 * @returns An object containing the redacted text and a boolean indicating if changes were made.
 */
function redactPII(text: string): { redacted: string; changed: boolean } {
  let redactedText = text;

  // More robust patterns for PII detection
  const patterns = [
    // Emails
    { regex: /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g, replace: '[email]' },
    // Phone numbers (various formats)
    { regex: /(\+?(\d{1,3})?[-. ]?)?\(?(\d{3})\)?[-. ]?(\d{3})[-. ]?(\d{4})/g, replace: '[phone]' },
    // Names (Capitalized words, assuming names are capitalized. Handles multi-word names.)
    { regex: /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g, replace: '[name]' },
    // Addresses (simplified, looks for number followed by capitalized street name)
    { regex: /\b\d{1,5}\s(?:[A-Z][a-z]+\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct)\b/g, replace: '[address]' },
    // Social Security Numbers
    { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replace: '[ssn]' },
  ];

  let hasChanged = false;

  for (const { regex, replace } of patterns) {
    if (regex.test(redactedText)) {
      redactedText = redactedText.replace(regex, replace);
      hasChanged = true;
    }
  }
  
  // Special case for names: avoid redacting words at the start of a sentence.
  // This is a simple heuristic and might not be perfect.
  const allWords = text.split(' ');
  const redactedWords = redactedText.split(' ');

  if (allWords.length === redactedWords.length) {
      for(let i=0; i<redactedWords.length; i++) {
          if (redactedWords[i] === '[name]' && i > 0 && allWords[i-1].endsWith('.')) {
             // This was likely the start of a sentence, not a name. Revert it.
             redactedWords[i] = allWords[i];
          }
      }
      redactedText = redactedWords.join(' ');
  }

  // Final check if the text actually changed after heuristics
  const changed = text !== redactedText;

  return { redacted: redactedText, changed: changed };
}


/**
 * Server Action: Anonymizes a message by redacting PII using a local, regex-based approach.
 * This is fast, reliable, and does not depend on an external AI service.
 */
export async function anonymizeMessage(
  input: AnonymizeMessageInput
): Promise<AnonymizeMessageOutput> {
  const { message } = input;

  if (!message.trim()) {
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }

  try {
    const { redacted, changed } = redactPII(message);
    return {
      anonymizedMessage: redacted,
      anonymized: changed,
    };
  } catch (error) {
    console.error('Error during local PII redaction:', error);
    // Fallback in case of an unexpected error in the regex function
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }
}
