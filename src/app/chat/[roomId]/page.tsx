import ChatLayout from '@/components/ghosttalk/chat-layout';

interface ChatPageProps {
  params: {
    roomId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  return <ChatLayout roomId={params.roomId} />;
}
