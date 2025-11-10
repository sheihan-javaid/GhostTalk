import ChatLayout from '@/components/ghosttalk/chat-layout';

// Updated interface to be compatible with latest Next.js PageProps
interface ChatPageProps {
  params: { roomId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ChatPage({ params }: ChatPageProps) {
  return <ChatLayout roomId={params.roomId} />;
}
