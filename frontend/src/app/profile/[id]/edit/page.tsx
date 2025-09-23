"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

export default function EditProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState({
  username: "",
  bio: "",
  location: "",
});


useEffect(() => {
  axios.get(`http://localhost:8000/api/auth/profile/${id}/`, { withCredentials: true })
    .then(res => {
      setUser({
        username: res.data.username || "",
        bio: res.data.bio || "",
        location: res.data.location || "",
      });
    })
    .catch(err => console.error(err));
}, [id]);

  const handleSave = async () => {
    try {
      await axios.patch(`http://localhost:8000/api/auth/profile/${id}/`, user, { withCredentials: true });
      router.push(`/profile/${id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Edit Profile</h1>

        <input
          type="text"
          placeholder="Username"
          value={user.username}
          onChange={(e) => setUser({ ...user, username: e.target.value })}
          className="w-full mb-4 px-4 py-2 border rounded-md text-black"
        />

        <textarea
          placeholder="Bio"
          value={user.bio}
          onChange={(e) => setUser({ ...user, bio: e.target.value })}
          className="w-full mb-4 px-4 py-2 border rounded-md text-black"
        />

        <input
          type="text"
          placeholder="Location"
          value={user.location}
          onChange={(e) => setUser({ ...user, location: e.target.value })}
          className="w-full mb-4 px-4 py-2 border rounded-md text-black"
        />

        <button
          onClick={handleSave}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
