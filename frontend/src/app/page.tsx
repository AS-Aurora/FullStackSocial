"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import PostCard from "@/components/PostCard";

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
  comment_count: number;
  comments: any[];
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

      
      {/* Posts Area */}
      <div className="flex-1 p-4 space-y-6">
        {loading ? (
          <p>Loading posts...</p>
        ) : posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={""} />
          ))
        )}
      </div>
    </div>
  );
}