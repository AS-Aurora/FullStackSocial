"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState({
    username: "",
    password: "",
  });
  const [errorData, setErrorData] = useState<any>(null);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const onLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:8000/api/auth/login/",
        user,
        { withCredentials: true }
      );
      setData(response.data);
      router.push("/");
    } catch (error: any) {
      setErrorData(
        error.response?.data || { detail: "An error occurred during login." }
      );
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.username.length > 0 && user.password.length > 0) {
      setButtonDisabled(false);
    } else {
      setButtonDisabled(true);
    }
  }, [user]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          {loading ? "Signing in..." : "Log in to Your Account"}
        </h1>

        <div className="space-y-5">
          <div>
            <input
              id="username"
              type="text"
              value={user.username}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
              placeholder="Username"
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
              placeholder="Password"
            />
          </div>
        </div>

        <button
          onClick={onLogin}
          disabled={buttonDisabled}
          className={`mt-6 w-full py-2 px-4 rounded-lg font-medium transition ${
            buttonDisabled
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          {loading ? "Processing..." : "Login"}
        </button>

        <div className="mt-6 flex justify-between text-sm text-gray-600">
          <Link href="/registration" className="hover:underline">
            Don’t have an account? <span className="text-gray-900">Sign up</span>
          </Link>
          <Link href="/forgot-password" className="hover:underline">
            Forgot password?
          </Link>
        </div>

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
