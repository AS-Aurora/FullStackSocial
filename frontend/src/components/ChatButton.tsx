'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { chatAPI } from '@/service/chatApi';

interface ChatButtonProps {
  userId: string;
  username: string;
  className?: string;
}

const ChatButton: React.FC<ChatButtonProps> = ({ userId, username, className = '' }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    setIsLoading(true);
    try {
      const { conversation } = await chatAPI.startConversation(userId);
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleStartChat}
      disabled={isLoading}
      className={`flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:opacity-90 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span className="font-semibold">
        {isLoading ? 'Loading...' : 'Message'}
      </span>
    </button>
  );
};

export default ChatButton;