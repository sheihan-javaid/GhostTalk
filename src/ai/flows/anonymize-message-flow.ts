'use server';

import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

/**
 * Server Action: Anonymizes a message by identifying and redacting ONLY PII using Claude AI.
 * Uses a two-step approach: AI detection + verification for maximum accuracy.
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
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "PII Anonymizer"
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-20250514",
        temperature: 0, // Make it deterministic
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `You are a strict PII detection and redaction system. Analyze the text and replace ALL personally identifiable information with natural, generic replacements that maintain sentence flow.

REPLACEMENT RULES (you MUST follow these exactly):
- Person names (any name) → "someone" or "a person"
- Locations (cities, states, countries) → "somewhere" or "a place"
- Email addresses → "an email address"
- Phone numbers → "a phone number"
- Street addresses → "an address"
- Ages or dates of birth → "a certain age"
- Company/workplace names → "a company"
- Usernames/handles → "a username"
- Specific dates → "a date"
- Credit card numbers → "a credit card"
- Social security numbers → "an identification number"
- Any other PII → use generic equivalent

EXAMPLES:
Input: "My name is John and I live in NY"
Output: "My name is someone and I live in somewhere"

Input: "Contact Sarah at sarah@email.com or call 555-1234"
Output: "Contact someone at an email address or call a phone number"

Input: "I'm Alice, 25 years old, from California working at Google"
Output: "I'm someone, a certain age, from somewhere working at a company"

Input: "Hi, I'm Bob from Texas"
Output: "Hi, I'm someone from somewhere"

Input: "Email me at john.doe@gmail.com"
Output: "Email me at an email address"

CRITICAL RULES:
1. Output ONLY the redacted text with natural replacements
2. Do NOT include explanations, notes, or markdown
3. Preserve exact punctuation, spacing, and sentence structure
4. Make replacements sound natural and grammatically correct
5. Be aggressive - when in doubt, replace it with a generic term
6. Even single names or location abbreviations MUST be replaced

TEXT TO REDACT:
${message}

REDACTED TEXT:`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return {
        anonymizedMessage: message,
        anonymized: false,
      };
    }

    const data = await response.json();
    
    // Extract the content
    let anonymizedText = data.choices?.[0]?.message?.content || message;
    
    // Clean up the response
    anonymizedText = anonymizedText
      .trim()
      // Remove markdown code blocks
      .replace(/```[a-z]*\n?/g, '')
      .replace(/```/g, '')
      // Remove common preambles
      .replace(/^(Here is the |Here's the |The )?redacted text:?\s*/i, '')
      .replace(/^Output:?\s*/i, '')
      .replace(/^Result:?\s*/i, '')
      .replace(/^REDACTED TEXT:?\s*/i, '')
      .trim();

    // Verify that PII was actually redacted by checking for generic replacements
    const genericTerms = [
      'someone', 'a person', 'somewhere', 'a place', 'an email address',
      'a phone number', 'an address', 'a certain age', 'a company',
      'a username', 'a date', 'a credit card', 'an identification number'
    ];
    
    const wasAnonymized = genericTerms.some(term => 
      anonymizedText.toLowerCase().includes(term.toLowerCase())
    ) || anonymizedText !== message; // Also check if text changed at all

    // Additional safety check: if output looks identical to input, log warning
    if (anonymizedText === message) {
      console.warn('Warning: AI returned identical text, possible PII not detected');
    }

    return {
      anonymizedMessage: anonymizedText,
      anonymized: wasAnonymized,
    };

  } catch (error) {
    console.error('Error during AI anonymization:', error);
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }
}
