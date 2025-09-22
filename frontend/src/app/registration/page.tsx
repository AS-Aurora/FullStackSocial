"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function SignUpPage() {
  const router = useRouter();
  const [user, setUser] = useState({
    username: "",
    email: "",
    password1: "",
    password2: "",
  });
  const [data, setData] = useState<{ detail?: string; [key: string]: any }>({});
  const [errorData, setErrorData] = useState<any>(null);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSignUp = async () => {
    try {
      setLoading(true);
      setErrorData(null);
      const response = await axios.post(
        "http://localhost:8000/api/auth/registration/",
        user
      );
      setData(response.data);
      setTimeout(() => {
        router.push("/login");
      }, 5000);
      if (response.data.success) {
        router.push("/login");
      }
    } catch (error: any) {
      setLoading(false);
      setErrorData(
        error.response?.data || {
          detail: "An error occurred during registration.",
        }
      );
    }
  };

  useEffect(() => {
    if (
      user.email.length > 0 &&
      user.username.length > 0 &&
      user.password1.length > 0 &&
      user.password2.length > 0 &&
      user.password1 === user.password2
    ) {
      setButtonDisabled(false);
    } else {
      setButtonDisabled(true);
    }
  }, [user]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        {/* Title */}
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          {loading ? "Creating account..." : "Sign Up"}
        </h1>

        {/* Inputs */}
        <div className="space-y-5">
          <input
            id="username"
            type="text"
            value={user.username}
            onChange={(e) => setUser({ ...user, username: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
            placeholder="Username"
          />

          <input
            id="email"
            type="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
            placeholder="Email address"
          />

          <input
            id="password"
            type="password"
            value={user.password1}
            onChange={(e) => setUser({ ...user, password1: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
            placeholder="Password"
          />

          <input
            id="confirm-password"
            type="password"
            value={user.password2}
            onChange={(e) => setUser({ ...user, password2: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
            placeholder="Confirm password"
          />
        </div>

        {/* Signup button */}
        <button
          onClick={onSignUp}
          disabled={buttonDisabled}
          className={`mt-6 w-full py-2 px-4 rounded-lg font-medium transition ${
            buttonDisabled
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        {/* Links */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-gray-900 font-medium hover:underline">
            Log in
          </Link>
        </p>

        {/* Success Message */}
        {data && data.detail && (
          <div className="mt-6 p-3 bg-green-50 text-green-700 rounded-md text-sm">
            <p>{data.detail}</p>
          </div>
        )}

        {/* Error Messages */}
        {errorData && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {Object.entries(errorData).map(([key, value], idx) => (
              <p key={idx}>
                <strong>{key}:</strong>{" "}
                {Array.isArray(value) ? value.join(" ") : String(value)}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
