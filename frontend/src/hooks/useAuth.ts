'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface User {
  pk: string;
  id: string;
  username: string;
  email: string;
  profile_picture?: string | null;
  full_name?: string;
}

interface AuthStatus {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkAuth: () => Promise<boolean>;
  setAuthState: (authenticated: boolean, user: User | null) => void;
}

const hasAuthCookie = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some(cookie => cookie.startsWith('jwt-auth='));
};

export const useAuth = (): AuthStatus => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

    const setAuthState = useCallback((authenticated: boolean, userData: User | null) => {
    setIsAuthenticated(authenticated);
    setUser(userData);
  }, []);

  const checkAuth = async (): Promise<boolean> => {

    if(!hasAuthCookie()) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    }

    try {
      setIsLoading(true);
      
      const response = await axios.get('http://localhost:8000/api/auth/user/', {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status < 500 // Resolve only if the status code is less than 500
      });

      if (response.status === 200 && response.data) {
        const userData = response.data;
        setUser(userData);
        setIsAuthenticated(true);
        return true;
      } else {
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    isAuthenticated,
    user,
    isLoading,
    checkAuth,
    setAuthState,
  };
};