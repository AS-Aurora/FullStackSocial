"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

type UserProfile = {
  id: string;
  username: string;
  email: string;
  profile_picture?: string;
  location?: string;
  bio?: string;
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await axios.post('http://localhost:8000/api/auth/logout/', {}, { withCredentials: true });

      router.push('/login');
      
    } catch (error: any) {
      console.error('Logout error:', error);
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    axios.get(`http://localhost:8000/api/auth/profile/${id}/`)
      .then(res => setProfile(res.data))
      .catch(err => console.error(err));
  }, [id]);

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8 text-center">
        <img
          src={profile.profile_picture ? profile.profile_picture : "/default.webp"}
          alt="Profile"
          className="w-24 h-24 rounded-full mx-auto mb-4 text-black border-2 border-gray-300"
        />
        <h1 className="text-2xl font-bold text-black">{profile.username}</h1>
        <p className="text-black">{profile.email}</p>
        <p className="mt-2 text-black">{profile.bio || "No bio yet."}</p>
        <p className="text-sm text-black">{profile.location}</p>

        <button
          onClick={() => router.push(`/profile/${id}/edit`)}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Edit Profile
        </button>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
}
