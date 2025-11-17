'use server';

import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

// -------------------------
// BASIC REGEX REDACTION
// -------------------------
function redactPII(text: string): { redacted: string; changed: boolean } {
  let out = text;
  let changed = false;

  const patterns = [
    // This more robust regex looks for one or more capitalized words in a row.
    // It's better at catching multi-word names like "John Doe".
    { regex: /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g, replace: "[name]" },
    { regex: /\b\d{10}\b/g, replace: "[phone]" },
    { regex: /\+?\d[\d\- ]{7,}\d/g, replace: "[phone]" },
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: "[email]" },
    { regex: /\b\d{1,5}\s(?:[A-Z][a-z]+\s){1,5}(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct)\b/g, replace: "[address]" },
  ];

  for (const p of patterns) {
    if (p.regex.test(out)) {
      // Use replaceAll to catch all instances, and re-test with a reset regex
      const resetRegex = new RegExp(p.regex);
      if (resetRegex.test(out)) {
        out = out.replace(p.regex, p.replace);
        changed = true;
      }
    }
  }

  return { redacted: out, changed };
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
