export interface User {
  id: string;
  username: string;
  email: string;
  profile_picture?: string | null;
  full_name?: string;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  content: string;
  image?: string | null;
  video?: string | null;
  author: User;
  privacy: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  comments: Comment[];
}

export interface LikeUpdateData {
  type: 'like_update';
  user_id: string;
  username: string;
  liked: boolean;
  like_count: number;
}

export interface NewCommentData {
  type: 'new_comment';
  comment: Comment;
}