'use server';

import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

// -------------------------
// BASIC REGEX REDACTION
// -------------------------
function redactPII(text: string): { redacted: string; changed: boolean } {
  let out = text;

  const patterns = [
    { regex: /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g, replace: "[name]" },
    { regex: /\b\d{10}\b/g, replace: "[phone]" },
    { regex: /\+?\d[\d\- ]{7,}\d/g, replace: "[phone]" },
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: "[email]" },
    { regex: /\b[A-Z][a-z]+(?:,\s[A-Z][a-z]+)*\b/g, replace: "[location]" },
    { regex: /\b\d{1,4}\s\w+(?:\s\w+){0,3}\b/g, replace: "[address]" },
  ];

  let changed = false;

  for (const p of patterns) {
    if (p.regex.test(out)) {
      out = out.replace(p.regex, p.replace);
      changed = true;
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
