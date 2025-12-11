import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export interface Notification {
  data: {};
  id: string;
  sender: {
    id: string;
    username: string;
    profile_picture?: string;
  };
  notification_type: 'like' | 'comment' | 'follow' | 'post';
  message: string;
  post_id?: string;
  comment_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  time_ago: string;
}

export const notificationAPI = {
  async getNotifications(): Promise<Notification[]> {
    const response = await api.get('/notifications/');
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count/');
    return response.data.unread_count;
  },

  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await api.post(`/notifications/${notificationId}/read/`);
    return response.data;
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/mark-all-read/');
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}/delete/`);
  },
};