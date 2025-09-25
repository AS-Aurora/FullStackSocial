"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Comments from "../components/Comments";

const HeartIcon = ({ filled = false, size = 20 }: { filled?: boolean; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "#ef4444" : "none"}
    stroke={filled ? "#ef4444" : "currentColor"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-all duration-200"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

type UserProfile = {
  id: string;
  username: string;
  profile_picture?: string;
};

type Post = {
  id: string;
  author: UserProfile;
  content: string;
  image?: string;
  video?: string;
  like_count: number;
  is_liked: boolean;
  created_at: string;
};

export default function Home() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    axios.get("http://localhost:8000/api/posts/", { withCredentials: true })
      .then(res => {
        setPosts(res.data);
        
        if (res.data && res.data.length > 0 && res.data[0].author?.id) {
          return axios.get(`http://localhost:8000/api/auth/profile/${res.data[0].author.id}/`);
        }
        return null;
      })
      .then(profileRes => {
        if (profileRes && profileRes.data) {
          setProfile(profileRes.data);
        }
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setError('Failed to load posts. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);


  const handleLike = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      // Optimistic update
      const newIsLiked = !post.is_liked;
      const newLikeCount = newIsLiked ? post.like_count + 1 : post.like_count - 1;

      // Update UI immediately
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, is_liked: newIsLiked, like_count: newLikeCount }
          : p
      ));

      let response;
      if (newIsLiked) {
        response = await axios.post(`http://localhost:8000/api/posts/${postId}/like/`, {}, { withCredentials: true });
      } else {
        response = await axios.post(`http://localhost:8000/api/posts/${postId}/unlike/`, {}, { withCredentials: true });
      }

      // Update with server response for consistency
      if (response.data) {
        setPosts(posts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                is_liked: response.data.is_liked, 
                like_count: response.data.like_count 
              }
            : p
        ));
      }

    } catch (err: any) {
      console.error('Error toggling like:', err);
      console.error('Error details:', err.response?.data);
      
      const post = posts.find(p => p.id === postId);
      if (post) {
        const revertedIsLiked = !post.is_liked;
        const revertedLikeCount = revertedIsLiked ? post.like_count + 1 : post.like_count - 1;
        
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, is_liked: revertedIsLiked, like_count: revertedLikeCount }
            : p
        ));
      }
      
      setError(`Failed to ${post?.is_liked ? 'unlike' : 'like'} post. Please try again.`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-1/4 p-4 bg-white shadow-lg flex flex-col items-center">
        {loading ? (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse mb-4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ) : profile ? (
          <>
            <img src={profile.profile_picture || "/default.webp"} className="w-24 h-24 rounded-full mb-4" />
            <h2 className="font-bold">{profile.username}</h2>
            <button onClick={() => router.push(`/profile/${profile.id}`)} className="mt-2 text-blue-600 hover:underline">
              View Profile
            </button>
          </>
        ) : (
          <div className="text-gray-500 text-center">
            <p>No user profile available</p>
          </div>
        )}
      </div>

      {/* Posts Feed */}
      <div className="flex-1 p-4 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-32 bg-gray-200 rounded mb-2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Post Header */}
              <div className="flex items-center p-4 pb-2">
                <img 
                  src={post.author.profile_picture || "/default.webp"} 
                  className="w-12 h-12 rounded-full mr-3 ring-2 ring-gray-100" 
                />
                <div className="flex-1">
                  <button 
                    onClick={() => router.push(`/profile/${post.author.id}`)} 
                    className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {post.author.username}
                  </button>
                  <p className="text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-gray-800 leading-relaxed">{post.content}</p>
              </div>

              {/* Media */}
              {post.image && (
                <div className="relative">
                  <img 
                    src={post.image} 
                    className="w-full max-h-96 object-cover" 
                    alt="Post image"
                  />
                </div>
              )}
              {post.video && (
                <div className="relative">
                  <video 
                    src={post.video} 
                    controls 
                    className="w-full max-h-96" 
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="px-4 py-3 border-t border-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Like Button */}
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
                        post.is_liked
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-red-600'
                      }`}
                    >
                      <HeartIcon filled={post.is_liked} size={18} />
                      <span className="text-sm font-medium">
                        {post.like_count > 0 ? post.like_count : 'Like'}
                      </span>
                    </button>

                    {/* Comment Button */}
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
                        expandedComments.has(post.id)
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                      }`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {expandedComments.has(post.id) ? 'Hide Comments' : 'Comment'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Like Count Display */}
                {post.like_count > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-50">
                    <p className="text-sm text-gray-600">
                      {post.like_count === 1 
                        ? '1 person likes this' 
                        : `${post.like_count} people like this`
                      }
                    </p>
                  </div>
                )}

                {/* Comments Section */}
                {expandedComments.has(post.id) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Comments postId={post.id} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
