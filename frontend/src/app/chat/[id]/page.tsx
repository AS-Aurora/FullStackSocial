'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { chatAPI, ConversationDetail, Message as MessageType } from '@/service/chatApi';
import { createChatWebSocketService, WebSocketMessage } from '@/service/chatWebsocket';
import { motion } from 'framer-motion';
import axios from 'axios';

const getImageUrl = (path?: string) => {
  if (!path || path.startsWith('http')) return path || '';
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export default function ChatConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsServiceRef = useRef(createChatWebSocketService());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Get current user
    axios
      .get('http://localhost:8000/api/auth/user/', { withCredentials: true })
      .then((res) => setCurrentUser(res.data))
      .catch((err) => {
        console.error('Error fetching current user:', err);
        router.push('/login');
      });

    // Fetch conversation
    fetchConversation();

    // Connect WebSocket
    const wsService = wsServiceRef.current;
    wsService.connect(conversationId);

    const handleWebSocketMessage = (data: WebSocketMessage) => {
      switch (data.type) {
        case 'message':
          if (data.message_id && data.message && data.sender_username) {
            const newMessage: MessageType = {
              id: data.message_id,
              conversation: conversationId,
              sender: {
                id: data.sender_id || '',
                username: data.sender_username,
                email: '',
                profile_picture: data.sender_profile_picture,
              },
              content: data.message,
              is_read: data.is_read || false,
              created_at: data.timestamp || new Date().toISOString(),
              updated_at: data.timestamp || new Date().toISOString(),
            };

            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });

            // Mark as read if not from current user
            if (currentUser && data.sender_id !== currentUser.pk) {
              setTimeout(() => {
                wsService.markAsRead([data.message_id!]);
              }, 500);
            }
          }
          break;

        case 'user_status':
          // Only update if it's the other user's status, not our own
          const myUserId = currentUser?.pk || currentUser?.id;
          if (myUserId && data.user_id !== String(myUserId)) {
            setOtherUserOnline(data.status === 'online');
          }
          break;

        case 'typing':
          setOtherUserTyping(data.is_typing || false);
          break;

        case 'messages_read':
          if (data.message_ids) {
            setMessages(prev =>
              prev.map(msg =>
                data.message_ids!.includes(msg.id) ? { ...msg, is_read: true } : msg
              )
            );
          }
          break;
      }
    };

    wsService.onMessage(handleWebSocketMessage);

    return () => {
      wsService.removeMessageCallback(handleWebSocketMessage);
      wsService.disconnect();
    };
  }, [conversationId, currentUser?.pk, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    try {
      setIsLoading(true);
      const data = await chatAPI.getConversation(conversationId);
      setConversation(data);
      setMessages(data.messages);
    } catch (error) {
      router.push('/chat');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputMessage.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setInputMessage('');
    const wsService = wsServiceRef.current;

    try {
      if (wsService.isConnected()) {
        wsService.sendMessage(content);
      } else {
        const newMessage = await chatAPI.sendMessage(conversationId, content);
        setMessages(prev => [...prev, newMessage]);
      }
    } catch (error) {
      setInputMessage(content);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      wsServiceRef.current.sendTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    const wsService = wsServiceRef.current;
    
    if (wsService.isConnected()) {
      wsService.sendTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => wsService.sendTyping(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  const otherParticipant = conversation.other_participant;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/chat')}
            className="text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <img
            src={getImageUrl(otherParticipant?.profile_picture)}
            alt={otherParticipant?.username}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default.webp';
            }}
          />

          <div>
            <h2 className="font-semibold text-gray-900">{otherParticipant?.username}</h2>
            <p className="text-xs text-gray-500">
              {otherUserOnline ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Online
                </span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/profile/${otherParticipant?.id}`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          View Profile
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender.id === currentUser?.pk;

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isOwnMessage
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <p className="break-words">{message.content}</p>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <span
                    className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}
                  >
                    {formatTime(message.created_at)}
                  </span>
                  {isOwnMessage && (
                    <span className="text-xs text-blue-100">
                      {message.is_read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing Indicator */}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-2xl px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}