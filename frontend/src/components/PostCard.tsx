"use client";

import { useEffect, useState, useRef } from "react";

type UserProfile = {
  id: string;
  username: string;
  profile_picture?: string;
};

type Comment = {
  id: string;
  author: UserProfile;
  content: string;
  created_at: string;
};

type PostData = {
  id: string;
  author: UserProfile;
  content: string;
  image?: string;
  video?: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  comments: Comment[];
  created_at: string;
};

interface PostCardProps {
  post: PostData;
  currentUserId: string; // <-- pass logged-in user id
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const [postState, setPostState] = useState<PostData>(post);
  const [newComment, setNewComment] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  // Extract JWT from cookie
  const getToken = () => {
    const token = document.cookie
      .split("; ")
      .find(row => row.startsWith("jwt="))
      ?.split("=")[1];
    return token;
  };

  // Connect to WebSocket
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/posts/${post.id}/?token=${token}`
    );
    wsRef.current = socket;

    socket.onopen = () => console.log(`Connected to post ${post.id} WS`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "initial_data":
          setPostState(prev => ({ ...prev, ...data }));
          break;

        case "comment":
          setPostState(prev => ({
            ...prev,
            comment_count: data.comment_count,
            comments: [...prev.comments, data.comment]
          }));
          break;

        case "like":
          setPostState(prev => ({
            ...prev,
            like_count: data.likes_count,
            is_liked: data.user_id === currentUserId ? data.is_liked : prev.is_liked
          }));
          break;
      }
    };

    socket.onclose = () => console.log(`Disconnected from post ${post.id} WS`);

    return () => {
      socket.close();
    };
  }, [post.id, currentUserId]);

  const handleLike = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: postState.is_liked ? "unlike" : "like" }));
    }
  };

  const handleComment = () => {
    if (!newComment.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({ type: "comment", content: newComment }));
    setNewComment("");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Post Header */}
      <div className="flex items-center p-4 pb-2">
        <img 
          src={postState.author.profile_picture || "/default.webp"} 
          className="w-12 h-12 rounded-full mr-3 ring-2 ring-gray-100" 
          alt={postState.author.username} 
        />
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{postState.author.username}</p>
          <p className="text-sm text-gray-500">
            {new Date(postState.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 leading-relaxed">{postState.content}</p>
      </div>

      {postState.image && <img src={postState.image} className="w-full max-h-96 object-cover" />}
      {postState.video && <video src={postState.video} controls className="w-full max-h-96" />}

      {/* Post Actions */}
      <div className="px-4 py-3 border-t border-gray-50">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
              postState.is_liked
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'text-gray-600 hover:bg-gray-50 hover:text-red-600'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={postState.is_liked ? "#ef4444" : "none"} stroke={postState.is_liked ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-sm font-medium">
              {postState.like_count > 0 ? postState.like_count : 'Like'}
            </span>
          </button>
        </div>

        {postState.like_count > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {postState.like_count === 1 ? '1 person likes this' : `${postState.like_count} people like this`}
          </p>
        )}

        {/* Comments */}
        <div className="mt-3">
          <div className="flex space-x-2 items-center">
            <input 
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 border border-gray-200 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button 
              onClick={handleComment} 
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Post
            </button>
          </div>

          <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
            {postState.comments.map(c => (
              <div key={c.id} className="border-b py-1 text-sm">
                <span className="font-semibold">{c.author.username}:</span> {c.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
