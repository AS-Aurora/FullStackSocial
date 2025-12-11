'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { chatAPI } from '@/service/chatApi';
import { notificationAPI } from '@/service/notificationApi';

const NavBar: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const publicRoutes = ['/login', '/registration', '/forgot-password', '/reset-password', '/verify-email'];

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (isPublicRoute) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    
    checkAuthStatus();
  }, [pathname, isPublicRoute]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchUnreadNotifications();

      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchUnreadNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const count = await chatAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const count = await notificationAPI.getUnreadCount();
      setUnreadNotifications(count);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/auth/user/', {
        withCredentials: true,
      });

      if (response.status === 200) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      if (!isPublicRoute) {
        console.error('Error checking auth status:', error);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/api/auth/logout/', {}, {
        withCredentials: true,
      });

      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading && !isPublicRoute) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">SocialApp</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
              SocialApp
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/create-post"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Create Post
                </Link>
                <Link
                  href="/notification"
                  className="relative text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <span className="flex items-center">
                    🔔 
                    {unreadNotifications > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </span>
                </Link>
                {/* Messages Link with Badge */}
                <Link
                  href="/chat"
                  className="relative text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <span className="flex items-center">
                    💬 Messages
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                </Link>

                <Link
                  href={`/profile/${user.pk}`}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                <span className="text-gray-700">Welcome, {user.username}</span>
                <Link
                  href="/feed"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Feed
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/registration"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;