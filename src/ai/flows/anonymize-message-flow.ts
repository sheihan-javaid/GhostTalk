'use server';

import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

// -------------------------
// BASIC REGEX PII SANITIZER
// -------------------------
function redactPII(text: string): { redacted: string; changed: boolean } {
  let redacted = text;

  // More specific regex for names to avoid redacting common words.
  // This looks for words starting with a capital letter that are not at the beginning of a sentence.
  const nameRegex = /(?<!\.\s)\b[A-Z][a-z]+\b/g;

  const patterns = [
    { regex: nameRegex, replace: "[name]" },
    { regex: /\b\d{10}\b/g, replace: "[phone]" },
    { regex: /\+?\d[\d\- ]{7,}\d/g, replace: "[phone]" },
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: "[email]" },
    // A more specific location regex, looking for sequences of capitalized words.
    { regex: /\b[A-Z][a-z]+(?:,\s[A-Z][a-z]+)*\b/g, replace: "[location]" }, 
    { regex: /\b\d{1,5}\s(?:[A-Z][a-z]+\s){1,5}(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct)\b/g, replace: "[address]" },
  ];

  let changed = false;
  for (const p of patterns) {
    if (p.regex.test(redacted)) {
      // Check if it's not just the first word of the message
      if (p.regex !== nameRegex || redacted.search(nameRegex) > 0) {
         redacted = redacted.replace(p.regex, p.replace);
         changed = true;
      }
    }
  }
  return { redacted, changed };
}

// -------------------------
// MAIN SERVER ACTION
// -------------------------
export async function anonymizeMessage(
  input: AnonymizeMessageInput
): Promise<AnonymizeMessageOutput> {
  const { message } = input;

  if (!message.trim()) {
    return { anonymizedMessage: message, anonymized: false };
  }

  const { redacted, changed } = redactPII(message);

  return {
    anonymizedMessage: redacted,
    anonymized: changed,
  };
}
