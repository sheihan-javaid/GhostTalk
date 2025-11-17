'use server';

import OpenAI from "openai";
import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://ghost-talk-ai.web.app",
    "X-Title": "GhostTalk",
  },
});

// -------------------------
// BASIC REGEX PII SANITIZER
// -------------------------
function regexRedactPII(text: string): { redacted: string; changed: boolean } {
  let redacted = text;

  const patterns = [
    { regex: /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g, replace: "[name]" },               // Names
    { regex: /\b\d{10}\b/g, replace: "[phone]" },                                     // Phone
    { regex: /\+?\d[\d\- ]{7,}\d/g, replace: "[phone]" },                             // Intl phones
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: "[email]" }, // Email
    { regex: /\b[A-Z][a-z]+(?:,\s[A-Z][a-z]+)*\b/g, replace: "[location]" },          // Cities
    { regex: /\b\d{1,4}\s\w+(?:\s\w+){0,3}\b/g, replace: "[address]" },                // Street addr
  ];

  let changed = false;
  for (const p of patterns) {
    if (p.regex.test(redacted)) {
      redacted = redacted.replace(p.regex, p.replace);
      changed = true;
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

  // FIRST → Try strict regex PII removal
  const regexResult = regexRedactPII(message);

  if (regexResult.changed) {
    return {
      anonymizedMessage: regexResult.redacted,
      anonymized: true,
    };
  }

  // If regex detected no PII → return as-is
  // (No need to call AI)
  return {
    anonymizedMessage: message,
    anonymized: false,
  };
}
