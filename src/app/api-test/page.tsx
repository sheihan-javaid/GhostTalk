'use client';

import { useState, useEffect } from 'react';
import { testApiKey } from '@/ai/flows/test-api-key';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ApiTestPage() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function runTest() {
      setIsLoading(true);
      const response = await testApiKey();
      setResult(response);
      setIsLoading(false);
    }
    runTest();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
      <Link href="/" className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-accent">&larr; Back to Home</Link>
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold text-accent mb-4">Gemini API Key Test</h1>
        <p className="text-muted-foreground mb-8">
          This page makes a single, simple request to the Gemini API to verify if your API key is configured correctly.
        </p>
        <div className="border border-border rounded-lg p-6 bg-secondary/30 min-h-[150px] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p>Running test...</p>
            </div>
          ) : (
            <pre className="text-left whitespace-pre-wrap font-mono text-sm">
              {result}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
