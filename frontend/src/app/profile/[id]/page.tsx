"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";

type UserProfile = {
  id: string;
  username: string;
  email: string;
  profile_picture?: string;
  location?: string;
  bio?: string;
  created_at?: string;
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
      await axios.post("http://localhost:8000/api/auth/logout/", {}, { withCredentials: true });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    axios
      .get(`http://localhost:8000/api/auth/profile/${id}/`)
      .then((res) => setProfile(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!profile)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="animate-spin h-12 w-12 border-b-2 border-white rounded-full"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-8 text-center"
      >
        {/* Profile Picture */}
        <div className="relative mb-6">
          <div className="w-28 h-28 mx-auto rounded-full border-2 border-white/30 shadow-lg overflow-hidden">
            <img
              src={profile.profile_picture || "/default.webp"}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Username & Email */}
        <h1 className="text-3xl font-semibold text-white mb-1">{profile.username}</h1>
        <p className="text-sm text-white/60 mb-4">{profile.email}</p>

        {/* Bio */}
        <p className="text-white/80 italic mb-3">
          {profile.bio ? `"${profile.bio}"` : "No bio added yet."}
        </p>

        {/* Location */}
        {profile.location && (
          <p className="text-sm text-blue-200 mb-4">
            📍 {profile.location}
          </p>
        )}

        {/* Joined Date */}
        {profile.created_at && (
          <p className="text-xs text-white/50 mb-6">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/profile/${id}/edit`)}
            className="w-full py-2.5 text-white font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 hover:shadow-lg transition-all"
          >
            Edit Profile
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-2.5 text-white font-semibold rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:opacity-90 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
