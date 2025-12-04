'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { chatAPI, Conversation } from '@/service/chatApi';
import { motion } from 'framer-motion';

const getImageUrl = (path?: string) => {
  if (!path || path.startsWith('http')) return path || '/default.webp';
  return `http://localhost:8000${path.startsWith('/') ? path : `/${path}`}`;
};

const formatDate = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function ChatListPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const data = await chatAPI.getConversations();
      setConversations(data);
    } catch (err) {
      setError('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">Your conversations</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Feed
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Conversations List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {conversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-600 mb-4">Start a conversation by visiting someone's profile</p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Go to Feed
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ backgroundColor: '#f9fafb' }}
                  onClick={() => router.push(`/chat/${conversation.id}`)}
                  className="p-4 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {/* Profile Picture */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={getImageUrl(conversation.other_participant?.profile_picture)}
                        alt={conversation.other_participant?.username}
                        className="w-14 h-14 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default.webp';
                        }}
                      />
                      {conversation.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </div>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {conversation.other_participant?.username}
                        </h3>
                        {conversation.last_message && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatDate(conversation.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {conversation.last_message ? (
                        <p className={`text-sm truncate ${
                          conversation.unread_count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'
                        }`}>
                          {conversation.last_message.sender_username === conversation.other_participant?.username
                            ? conversation.last_message.content
                            : `You: ${conversation.last_message.content}`}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No messages yet</p>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}