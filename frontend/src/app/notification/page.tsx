'use client';
import React, { useState, useEffect } from 'react';
import { notificationAPI, Notification } from '@/service/notificationApi';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
    const markUnreadAsRead = async () => {
      try {
        await notificationAPI.markAllAsRead();
      } catch (err) {
      }
    };
    markUnreadAsRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notificationAPI.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await notificationAPI.markAsRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
      }
    }

    if (notification.notification_type === 'follow') {
      router.push(`/profile/${notification.sender.id}`);
    } else if (notification.post_id) {
      router.push(`/posts/${notification.post_id}`);
    } else {
      router.push(`/`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
    }
  };

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await notificationAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👥';
      case 'post': return '📝';
      default: return '🔔';
    }
  };

  const renderNotificationText = (n: Notification) => {
    const senderName = n.sender?.username ?? 'Someone';
    const payload = (n.data ?? {}) as any;

    switch (n.notification_type) {
      case 'like':
        return `${senderName} liked your post${payload.post_excerpt ? `: "${payload.post_excerpt}"` : ''}`;
      case 'comment':
        return `${senderName} commented: "${payload.comment_excerpt ?? payload.comment ?? ''}"`;
      case 'follow':
        return `${senderName} started following you`;
      case 'post':
        return `${senderName} posted: "${payload.title ?? payload.excerpt ?? ''}"`;
      default:
        return `${senderName} sent you a notification`;
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <div className="text-gray-400 text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600">
                We'll notify you when something happens!
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  p-4 rounded-lg shadow-sm cursor-pointer transition-all
                  ${notification.is_read
                    ? 'bg-white hover:bg-gray-50'
                    : 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500'
                  }
                `}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.notification_type)}
                  </div>

                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    {notification.sender?.profile_picture ? (
                      <img
                        src={notification.sender.profile_picture}
                        alt={notification.sender.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                        {notification.sender?.username ? notification.sender.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-gray-800">
                        <div className="font-medium">
                          {notification.sender?.username ?? 'Someone'}
                        </div>
                        <div className="text-gray-600 text-sm mt-1">
                          {renderNotificationText(notification)}
                        </div>
                      </div>

                      {/* Timestamp & delete */}
                      <div className="ml-3 flex-shrink-0 text-right">
                        <div className="text-xs text-gray-400">
                          {formatTime(notification.created_at)}
                        </div>
                        <button
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                          className="mt-2 text-xs text-red-500 hover:text-red-600"
                          aria-label="Delete notification"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
