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
            role: "user",
            content: `You are a PII (Personally Identifiable Information) anonymizer. Your task is to identify and redact ONLY the following types of PII in the text below:

- Full names (first and last names of real people)
- Email addresses
- Phone numbers
- Physical addresses (street addresses, apartment numbers)
- Social security numbers
- Credit card numbers
- Bank account numbers
- Driver's license numbers
- Passport numbers
- IP addresses
- Dates of birth
- Medical record numbers

IMPORTANT RULES:
1. Replace each type of PII with a placeholder in square brackets: [name], [email], [phone], [address], [ssn], [credit_card], [account], [license], [passport], [ip], [dob], [medical_id]
2. Do NOT redact common words, pronouns, or generic references
3. Do NOT redact company names, product names, or brand names unless they are part of a personal identifier
4. Preserve ALL punctuation, formatting, and non-PII content exactly as written
5. Return ONLY the anonymized text with no explanations or additional commentary

Text to anonymize:
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
    const anonymizedText = data.choices?.[0]?.message?.content?.trim() || message;

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
