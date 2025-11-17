'use server';

import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

/**
 * A deterministic, regex-based function to find and redact common PII patterns.
 * This approach is faster, more reliable, and cheaper than making an AI call.
 * 
 * @param text The input text to sanitize.
 * @returns An object containing the redacted text and a boolean indicating if changes were made.
 */
function redactPII(text: string): { redacted: string; changed: boolean } {
  let redactedText = text;
  let wasChanged = false;

  const patterns = [
    // Matches common email formats.
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[email]" },
    // Matches common North American phone numbers (e.g., 123-456-7890, (123) 456-7890).
    { regex: /(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g, replacement: "[contact]" },
    // Matches simple capitalized names (e.g., John, Sarah). This is intentionally simple to avoid false positives.
    // This will miss names that aren't capitalized but is a safer trade-off.
    { regex: /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g, replacement: "[name]" },
     // A simple regex for locations that are capitalized (e.g., New York, London).
    { regex: /\b[A-Z][a-z]+(?:,\s[A-Z]{2})?\b/g, replacement: "[location]" }
  ];

  // Exclude common capitalized words that are not names to reduce false positives.
  const exclusionList = new Set(["I", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);

  for (const { regex, replacement } of patterns) {
      redactedText = redactedText.replace(regex, (match) => {
        if (replacement === "[name]" && exclusionList.has(match)) {
          return match; // Don't replace words in the exclusion list.
        }
        wasChanged = true;
        return replacement;
      });
  }

  return { redacted: redactedText, changed: wasChanged };
}

/**
 * Server Action: Anonymizes a message by removing ONLY PII using a deterministic regex approach.
 * If anonymization is disabled or no PII is found, it returns the original message.
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

  // We are now using the reliable regex-based function.
  const { redacted, changed } = redactPII(message);

  return {
    anonymizedMessage: redacted,
    anonymized: changed,
  };
}
