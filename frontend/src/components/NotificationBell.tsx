'use client';

import React, { useState, useEffect } from 'react';
import { notificationAPI } from '@/service/notificationApi';
import Link from 'next/link';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    connectToNotifications();
    
    return () => {
      clearInterval(interval);
      disconnectFromNotifications();
    };
    
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const connectToNotifications = () => {
    const ws = new WebSocket('ws://localhost:8000/ws/notifications/');
    ws.onopen = () => {
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        setUnreadCount(prev => prev + 1);
        if (Notification.permission === 'granted') {
          new Notification('New Notification', {
            body: data.notification.message,
            icon: '/logo.png'
          });
        }
      }
    };
    
    ws.onerror = (error) => {
    };
    
    ws.onclose = () => {
    };
    
    (window as any).notificationWs = ws;
  };

  const disconnectFromNotifications = () => {
    const ws = (window as any).notificationWs;
    if (ws) {
      ws.close();
    }
  };

  if (isLoading) {
    return (
      <div className="relative">
        <span className="text-2xl">🔔</span>
      </div>
    );
  }

  return (
    <Link href="/notifications" className="relative">
      <span className="text-2xl hover:scale-110 transition-transform">🔔</span>
      
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}