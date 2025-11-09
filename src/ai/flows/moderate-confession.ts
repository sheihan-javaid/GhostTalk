'use server';

import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY, { endpoint: "https://api-inference.huggingface.co/models" });

interface ModerationResult {
  isAppropriate: boolean;
  reason?: string;
}

export async function moderateConfession(text: string): Promise<ModerationResult> {
  try {
    const result = await hf.textClassification({
      model: 'facebook/roberta-hate-speech-dynabench-r4-target',
      inputs: text,
    });

    // This model provides scores for 'hate', 'nothate'. We'll be strict.
    // Find the label with the highest score.
    const topResult = result.reduce((prev, current) => (prev.score > current.score) ? prev : current);

    if (topResult.label === 'hate') {
      return {
        isAppropriate: false,
        reason: `Content was flagged as inappropriate (score: ${topResult.score.toFixed(2)}).`,
      };
    }

    return { isAppropriate: true };

  } catch (error) {
    console.error('Failed to moderate confession with Hugging Face:', error);
    // Default to inappropriate on error to be safe
    return {
      isAppropriate: false,
      reason: 'Could not be analyzed by the moderator.',
    };
  }
}
