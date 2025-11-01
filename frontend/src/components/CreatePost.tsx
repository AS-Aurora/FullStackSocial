'use client';

import React, { useState, useRef } from 'react';
import { postAPI } from '@/service/api';
import { Post } from '@/types/post';

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [privacy, setPrivacy] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setVideo(null);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideo(file);
      setImage(null);
      setImagePreview(null);
    }
  };

  const clearMedia = () => {
    setImage(null);
    setVideo(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newPost = await postAPI.createPost({
        content: content.trim(),
        image: image || undefined,
        video: video || undefined,
        privacy,
      });

      onPostCreated(newPost);
      setContent('');
      setImage(null);
      setVideo(null);
      setImagePreview(null);
      setPrivacy('public');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/60 border border-white/20 shadow-lg rounded-2xl p-6 mb-8 transition-all duration-300 hover:shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Create a Post
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 placeholder-gray-500"
          rows={4}
          disabled={isSubmitting}
        />

        {/* Media Preview */}
        {imagePreview && (
          <div className="relative mb-3">
            <img
              src={imagePreview}
              alt="Preview"
              className="rounded-xl max-h-64 w-full object-cover shadow-md"
            />
            <button
              type="button"
              onClick={clearMedia}
              className="absolute top-3 right-3 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-700 transition"
            >
              x
            </button>
          </div>
        )}

        {video && (
          <div className="relative mb-3">
            <div className="bg-white/70 rounded-xl p-4 flex items-center justify-between border border-gray-200 shadow-sm">
              <span className="text-gray-800 text-sm">🎬 {video.name}</span>
              <button
                type="button"
                onClick={clearMedia}
                className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition"
              >
                x
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            {/* Upload Buttons */}
            <label className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-gray-200 rounded-lg hover:bg-white/70 transition cursor-pointer shadow-sm">
              <span className="text-sm font-medium text-gray-700">Photo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>

            <label className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-gray-200 rounded-lg hover:bg-white/70 transition cursor-pointer shadow-sm">
              <span className="text-sm font-medium text-gray-700">Video</span>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>

            {/* Privacy */}
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white/60 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Private</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md ${
              !content.trim() || isSubmitting
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
