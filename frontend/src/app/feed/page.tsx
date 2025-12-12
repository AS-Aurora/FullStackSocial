'use client';

import React, { useState, useEffect, useRef } from 'react';
import { followAPI } from '@/service/followApi';
import PostCard from '@/components/PostCard';
import { Post } from '@/types/post';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeed();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, page]);

  const fetchFeed = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const feedData = await followAPI.getFeed(1, 20);
      setPosts(feedData.results);
      setHasMore(feedData.page < feedData.num_pages);
      setPage(1);
    } catch (err: any) {
      setError('Failed to load your feed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isLoading) return;
    
    try {
      setIsLoading(true);
      const nextPage = page + 1;
      const feedData = await followAPI.getFeed(nextPage, 20);
      setPosts(prev => [...prev, ...feedData.results]);
      setHasMore(feedData.page < feedData.num_pages);
      setPage(nextPage);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Feed</h1>
          <p className="text-gray-600">Posts from people you follow</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchFeed}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Initial Loading */}
        {isLoading && posts.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Posts Feed */}
            <div>
              {posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <div className="text-gray-400 text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Your feed is empty
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Follow some users to see their posts here!
                  </p>
                  <a
                    href="/"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Explore Posts
                  </a>
                </div>
              ) : (
                <>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}

                  {/* Infinite Scroll Trigger */}
                  <div ref={loaderRef} className="py-4">
                    {isLoading && hasMore && (
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}