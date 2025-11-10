'use client';

import { Ghost } from 'lucide-react';

export default function LoadingGhost() {
  return (
    <div className="flex flex-col h-screen bg-background items-center justify-center text-foreground">
      <div className="relative">
        <Ghost className="h-24 w-24 text-accent animate-pulse" />
        <div className="absolute top-0 left-0 h-full w-full bg-accent rounded-full animate-ping opacity-10"></div>
      </div>
      <p className="mt-6 text-xl font-semibold tracking-wider animate-pulse">
        Summoning your ghost...
      </p>
    </div>
  );
}
