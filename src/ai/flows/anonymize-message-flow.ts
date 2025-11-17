
'use server';

import type { AnonymizeMessageInput, AnonymizeMessageOutput } from "@/lib/types";

/**
 * Server Action: Anonymizes a message by identifying and redacting ONLY PII using Claude AI.
 * This provides intelligent, context-aware PII detection while preserving all other content.
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
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: "You are a PII redaction system. You MUST output ONLY the redacted text with no explanations, no preamble, no markdown formatting. Just the text with PII replaced by placeholders."
          },
          {
            role: "user",
            content: `Redact ALL personally identifiable information (PII) from the text below. Replace PII with these exact placeholders:

- Full names → [name]
- Email addresses → [email]
- Phone numbers → [phone]
- Street/physical addresses → [address]
- Social security numbers → [ssn]
- Credit card numbers → [credit_card]
- Bank account numbers → [account]
- Driver's license numbers → [license]
- Passport numbers → [passport]
- IP addresses → [ip]
- Dates of birth → [dob]
- Medical record numbers → [medical_id]

CRITICAL: Output ONLY the redacted text. Do NOT add explanations, notes, or formatting. Preserve all non-PII words, punctuation, and structure exactly.

Text:
${message}`
          }
        ],
      })
    });

    if (!response.ok) {
      console.error('AI anonymization failed, falling back to original message');
      return {
        anonymizedMessage: message,
        anonymized: false,
      };
    }

    const data = await response.json();
    
    // Extract the content and clean it
    let anonymizedText = data.choices?.[0]?.message?.content?.trim() || message;
    
    // Remove any markdown code blocks if present
    anonymizedText = anonymizedText.replace(/```[a-z]*\n?/g, '').trim();
    
    // Remove common AI preambles
    const preambles = [
      /^Here is the redacted text:?\s*/i,
      /^Here's the text with PII redacted:?\s*/i,
      /^Redacted text:?\s*/i,
      /^The redacted version is:?\s*/i
    ];
    
    for (const pattern of preambles) {
      anonymizedText = anonymizedText.replace(pattern, '');
    }

    // Check if any PII was actually redacted
    const piiPlaceholders = [
      '[name]', '[email]', '[phone]', '[address]', '[ssn]', 
      '[credit_card]', '[account]', '[license]', '[passport]', 
      '[ip]', '[dob]', '[medical_id]'
    ];
    
    const wasAnonymized = piiPlaceholders.some(placeholder => 
      anonymizedText.includes(placeholder)
    );

    return {
      anonymizedMessage: anonymizedText,
      anonymized: wasAnonymized,
    };

  } catch (error) {
    console.error('Error during AI anonymization:', error);
    // Fallback: return original message if AI call fails
    return {
      anonymizedMessage: message,
      anonymized: false,
    };
  }
}
