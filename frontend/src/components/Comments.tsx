"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

interface Comment {
  id: string;
  author: {
    id: string;
    username: string;
    profile_picture?: string;
  };
  content: string;
  created_at: string;
}

interface CommentsProps {
  postId: string;
}

const Comments: React.FC<CommentsProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/posts/${postId}/comments/`, { withCredentials: true });
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:8000/api/posts/${postId}/comments/`, {
        content: newComment,
      }, { withCredentials: true });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.length ? (
          comments.map((c) => (
            <div
              key={c.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-start space-x-3">
                <img 
                  src={c.author.profile_picture || "/default.webp"} 
                  className="w-8 h-8 rounded-full flex-shrink-0" 
                  alt={c.author.username}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{c.author.username}</p>
                  <p className="text-gray-800 text-sm mt-1">{c.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(c.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No comments yet. Be the first to comment!</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex space-x-3 items-end">
        <div className="flex-1">
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !newComment.trim()}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
};

export default Comments;