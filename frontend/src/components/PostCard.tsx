'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post, Comment } from '@/types/post';
import { createWebSocketService } from '@/service/websocket';
import { postAPI } from '@/service/api';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'unauthorized'>('connecting');
  
  const webSocketServiceRef = useRef(createWebSocketService());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const webSocketService = webSocketServiceRef.current;
    // console.log(`Initializing WebSocket connection for post: ${post.id}`);
    
    // Connect without token - cookies will be sent automatically by the browser
    webSocketService.connect(post.id);

    const handleWebSocketMessage = (data: any) => {
      if (data.post_id !== post.id) {
        return;
      }

      // console.log(`WebSocket message received for post ${post.id}:`, data);
      if (!isMountedRef.current) return;

      switch (data.type) {
        case 'like_update':
          setCurrentPost(prev => ({
            ...prev,
            like_count: data.like_count,
            is_liked: data.user_id === currentPost.author.id ? data.liked : prev.is_liked
          }));
          break;
        
        case 'new_comment':
          setCurrentPost(prev => {
            const commentId = data.comment.id;
            const commentExists = prev.comments.some(comment => comment.id === commentId);
            if (commentExists) {
              // console.log(`Comment ${commentId} already exists, skipping duplicate`);
              return prev;
            }

            // console.log(`Adding new comment ${commentId} to post ${post.id}`);
            return {
              ...prev,
              comments: [data.comment, ...prev.comments],
              comment_count: prev.comment_count + 1
            };
          });
          break;

        case 'connection_established':
          setConnectionStatus('connected');
          // console.log(`WebSocket connection established for post ${post.id}`);
          break;

        case 'connection_status':
          if (data.status === 'connected') {
            setConnectionStatus('connected');
          } else if (data.status === 'reconnecting') {
            setConnectionStatus('connecting');
          } else if (data.status === 'disconnected') {
            setConnectionStatus('disconnected');
          }
          break;

        case 'error':
          // console.error(`WebSocket error for post ${post.id}:`, data.error);
          if (data.error === 'Authentication required') {
            setConnectionStatus('unauthorized');
          }
          break;
      }
    };

    webSocketService.onMessage(handleWebSocketMessage);

    return () => {
      // console.log(`Cleaning up WebSocket connection for post: ${post.id}`);
      isMountedRef.current = false;
      const webSocketService = webSocketServiceRef.current;
      webSocketService.removeMessageCallback(handleWebSocketMessage);
      webSocketService.disconnect();
    };
  }, [post.id, currentPost.author.id]);

  // ... rest of the component remains exactly the same
  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const wasLiked = currentPost.is_liked;
      const newLikeCount = wasLiked ? currentPost.like_count - 1 : currentPost.like_count + 1;
      
      setCurrentPost(prev => ({
        ...prev,
        is_liked: !wasLiked,
        like_count: newLikeCount
      }));

      const webSocketService = webSocketServiceRef.current;
      if (connectionStatus === 'connected') {
        webSocketService.sendLike();
      } else {
        const result = await postAPI.likePost(post.id);
        setCurrentPost(prev => ({
          ...prev,
          is_liked: result.liked,
          like_count: result.like_count
        }));
      }
    } catch (error) {
      console.error('Error liking post:', error);
      setCurrentPost(prev => ({
        ...prev,
        is_liked: !prev.is_liked,
        like_count: prev.is_liked ? prev.like_count - 1 : prev.like_count + 1
      }));
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isCommenting) return;

    setIsCommenting(true);
    const commentContent = newComment.trim();
    
    try {
      const webSocketService = webSocketServiceRef.current;
      
      if (connectionStatus === 'connected') {
        webSocketService.sendComment(commentContent);
      } else {
        const newCommentData = await postAPI.createComment(post.id, commentContent);
        setCurrentPost(prev => {
          const commentExists = prev.comments.some(comment => comment.id === newCommentData.id);
          if (commentExists) {
            // console.log(`Comment ${newCommentData.id} already exists, skipping duplicate`);
            return prev;
          }
          
          return {
            ...prev,
            comments: [newCommentData, ...prev.comments],
            comment_count: prev.comment_count + 1
          };
        });
      }
      
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsCommenting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'unauthorized': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live';
      case 'connecting': return 'Connecting';
      case 'disconnected': return 'Offline';
      case 'unauthorized': return 'Login Required';
      default: return 'Unknown';
    }
  };

  const getCommentKey = (comment: Comment) => {
    return `comment-${comment.id}-${post.id}-${comment.created_at}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
      {/* Post Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {currentPost.author?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {currentPost.author?.full_name || currentPost.author?.username || 'Unknown User'}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDate(currentPost.created_at)}
                </p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {currentPost.privacy}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="p-4">
        {currentPost.content && (
          <p className="text-gray-800 whitespace-pre-wrap mb-4">{currentPost.content}</p>
        )}
        
        {/* Media Display */}
        {currentPost.image && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img 
              src={currentPost.image} 
              alt="Post image" 
              className="w-full h-auto max-h-96 object-cover"
              onError={(e) => {
                console.error('Image failed to load:', currentPost.image);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        {currentPost.video && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <video 
              controls 
              className="w-full h-auto max-h-96"
              poster={currentPost.image || undefined}
            >
              <source src={currentPost.video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>

      {/* Post Stats */}
      <div className="px-4 py-3 border-t border-b border-gray-100 bg-gray-50">
        <div className="flex justify-between text-sm text-gray-600">
          <span className="flex items-center space-x-1">
            <span>❤️</span>
            <span>{currentPost.like_count || 0} likes</span>
          </span>
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-1 hover:text-blue-600"
          >
            <span>💬</span>
            <span>{currentPost.comment_count || 0} comments</span>
          </button>
        </div>
      </div>

      {/* Post Actions */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex space-x-4">
          <button
            onClick={handleLike}
            disabled={isLiking || connectionStatus === 'unauthorized'}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center ${
              currentPost.is_liked 
                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                : 'text-gray-600 hover:bg-gray-100'
            } ${(isLiking || connectionStatus === 'unauthorized') ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`text-lg ${currentPost.is_liked ? 'text-red-500' : 'text-gray-400'}`}>
              ❤️
            </span>
            <span className="font-medium">{currentPost.is_liked ? 'Liked' : 'Like'}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            disabled={connectionStatus === 'unauthorized'}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center ${
              connectionStatus === 'unauthorized' 
                ? 'opacity-50 cursor-not-allowed' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="text-lg">💬</span>
            <span className="font-medium">Comment</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="p-4 bg-gray-50">
          {/* Connection warning */}
          {connectionStatus !== 'connected' && connectionStatus !== 'unauthorized' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                {connectionStatus === 'connecting' 
                  ? 'Connecting to real-time features...' 
                  : 'Real-time features temporarily unavailable. Using fallback mode.'}
              </p>
            </div>
          )}

          {connectionStatus === 'unauthorized' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                Please log in to comment and see real-time updates.
              </p>
            </div>
          )}

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-4">
            <div className="flex space-x-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isCommenting || connectionStatus === 'unauthorized'}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isCommenting || connectionStatus === 'unauthorized'}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCommenting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {!currentPost.comments || currentPost.comments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">💬</div>
                <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              currentPost.comments.map((comment) => (
                <div key={getCommentKey(comment)} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {comment.author?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {comment.author?.full_name || comment.author?.username || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-800 text-sm break-words">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;