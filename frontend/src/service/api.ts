import axios from 'axios';
import { Post, Comment } from '@/types/post';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export const postAPI = {
  async getPosts() {
    const response = await api.get('/posts/');
    return response.data as Post[];
  },

  async getPost(id: string) {
    const response = await api.get(`/posts/${id}/`);
    return response.data as Post;
  },

  async createPost(data: { content: string; image?: File; video?: File; privacy?: string }) {
    const formData = new FormData();
    formData.append('content', data.content);
    if (data.image) formData.append('image', data.image);
    if (data.video) formData.append('video', data.video);
    if (data.privacy) formData.append('privacy', data.privacy);

    const response = await api.post('/posts/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as Post;
  },

  async likePost(postId: string) {
    const response = await api.post(`/posts/${postId}/like/`);
    return response.data as { liked: boolean; like_count: number };
  },

  async getComments(postId: string) {
    const response = await api.get(`/posts/${postId}/comments/`);
    return response.data as Comment[];
  },

  async createComment(postId: string, content: string) {
    const response = await api.post('/comments/', { post: postId, content });
    return response.data as Comment;
  },
};

export default api;
