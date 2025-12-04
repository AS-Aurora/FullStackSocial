import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
});

export interface User {
  id: string;
  username: string;
  email: string;
  profile_picture?: string;
  bio?: string;
}

export interface Message {
  id: string;
  conversation: string;
  sender: User;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant1: User;
  participant2: User;
  other_participant: User;
  last_message?: {
    id: string;
    content: string;
    sender_username: string;
    created_at: string;
    is_read: boolean;
  };
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: string;
  participant1: User;
  participant2: User;
  other_participant: User;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export const chatAPI = {
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get('/chat/conversations/');
    return response.data;
  },

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const response = await api.get(`/chat/conversations/${conversationId}/`);
    return response.data;
  },

  async startConversation(userId: string): Promise<{ conversation: ConversationDetail; created: boolean }> {
    const response = await api.post('/chat/conversations/start/', { user_id: userId });
    return response.data;
  },

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const response = await api.post(`/chat/conversations/${conversationId}/messages/`, { content });
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/chat/unread-count/');
    return response.data.unread_count;
  }
};

export default chatAPI;