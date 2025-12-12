import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export interface FollowResponse {
  id: string;
  follower: string;
  following: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  profile_picture?: string;
  location?: string;
  bio?: string;
  full_name?: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  created_at: string;
}

export const followAPI = {
  async followUser(userId: string): Promise<FollowResponse> {
    const response = await api.post(`/auth/follow/${userId}/`);
    return response.data;
  },

  async unfollowUser(userId: string): Promise<void> {
    await api.delete(`/auth/unfollow/${userId}/`);
  },

  async checkFollowStatus(userId: string): Promise<{ is_following: boolean }> {
    const response = await api.get(`/auth/check-follow/${userId}/`);
    return response.data;
  },

  async getFeed(page: number = 1, pageSize: number = 10): Promise<{ results: any[], count: number, num_pages: number, page: number }> {
    const response = await api.get('/feed/ranked/', {
      params: { page, page_size: pageSize }
    });
    return response.data;
  },

  async getFollowers(userId: string): Promise<UserProfile[]> {
    const response = await api.get(`/auth/users/${userId}/followers/`);
    return response.data;
    
  },

  async getFollowing(userId: string): Promise<UserProfile[]> {
    const response = await api.get(`/auth/users/${userId}/following/`);
    return response.data;
  },
};