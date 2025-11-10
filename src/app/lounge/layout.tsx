import Link from 'next/link';

export default function LoungeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center min-h-screen bg-background p-4 md:p-8">
      <Link href="/" className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-accent">&larr; Back to Home</Link>
      {children}
    </div>
  );
}
