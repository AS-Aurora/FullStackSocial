'use client';

import React, { useState, useEffect } from 'react';
import { followAPI } from '@/service/followApi';

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export default function FollowButton({
  userId,
  initialFollowing = false,
  onFollowChange,
  className = ''
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { is_following } = await followAPI.checkFollowStatus(userId);
        setIsFollowing(is_following);
      } catch (err) {
        console.error('Error checking follow status:', err);
      }
    };

    checkStatus();
  }, [userId]);

  const handleToggleFollow = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isFollowing) {
        await followAPI.unfollowUser(userId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await followAPI.followUser(userId);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update follow status';
      setError(errorMessage);
      console.error('Follow toggle error:', err);
      
      setIsFollowing(!isFollowing);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleToggleFollow}
        disabled={isLoading}
        className={`
          px-6 py-2 rounded-lg font-semibold transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isFollowing
            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
          </span>
        ) : (
          <span>{isFollowing ? 'Following' : 'Follow'}</span>
        )}
      </button>
      
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}