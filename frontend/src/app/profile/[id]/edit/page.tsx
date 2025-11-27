"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";

const API_BASE_URL = "http://localhost:8000";

export default function EditProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [user, setUser] = useState({
    username: "",
    bio: "",
    location: "",
    profile_picture: null as File | null,
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/auth/profile/${id}/`, {withCredentials: true})
      .then((res) => {
        setUser({
          username: res.data.username || "",
          bio: res.data.bio || "",
          location: res.data.location || "",
          profile_picture: null,
        });
        
        if (res.data.profile_picture) setPreview(res.data.profile_picture);
      })
      .catch((err) => {
        console.error("Error loading profile:", err);
        setError("Failed to load profile data");
      });
  }, [id]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please select a valid image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }

      setError(null);
      setUser({ ...user, profile_picture: file });

      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("username", user.username);
    formData.append("bio", user.bio);
    formData.append("location", user.location);
    
    if (user.profile_picture) formData.append("profile_picture", user.profile_picture);

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/auth/profile/${id}/`,
        formData,
        {
          withCredentials: true,
        }
      );

      router.push(`/profile/${id}`);
    } catch (error: any) {
      console.error("Save error:", error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        setError(errorMessages || "Failed to save profile");
      } else {
        setError("Failed to save profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-8"
      >
        <h1 className="text-3xl font-semibold text-center text-white mb-6">
          Edit Profile
        </h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {preview ? (
              <img
                src={preview}
                alt="Profile Preview"
                className="w-28 h-28 rounded-full object-cover border-2 border-white/30 shadow-lg"
                onError={(e) => {
                  console.error("Preview image failed to load");
                  (e.target as HTMLImageElement).src = "/default.webp";
                }}
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 text-2xl">
                👤
              </div>
            )}
            <label
              htmlFor="profile_picture"
              className="absolute bottom-1 right-1 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition"
              title="Change profile picture"
            >
              📷
            </label>
            <input
              id="profile_picture"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-white/50 mt-2">Click camera icon to change</p>
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="text-white/80 text-sm mb-1 block">Username</label>
          <input
            type="text"
            value={user.username}
            onChange={(e) => setUser({ ...user, username: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Your username"
          />
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="text-white/80 text-sm mb-1 block">Bio</label>
          <textarea
            value={user.bio}
            onChange={(e) => setUser({ ...user, bio: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 outline-none resize-none"
            placeholder="Tell something about yourself..."
            maxLength={500}
          />
          <p className="text-xs text-white/50 mt-1">{user.bio.length}/500</p>
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="text-white/80 text-sm mb-1 block">Location</label>
          <input
            type="text"
            value={user.location}
            onChange={(e) => setUser({ ...user, location: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="e.g., New Delhi, India"
            maxLength={100}
          />
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 text-white font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/profile/${id}`)}
            disabled={isSaving}
            className="w-full py-2.5 text-white/80 font-semibold rounded-lg bg-white/10 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}