"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [errorData, setErrorData] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      setErrorData(null);
      setSuccessMessage("");

      const response = await fetch("http://localhost:8000/api/auth/password-reset/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || "Password reset email sent successfully!");
        setEmail(""); // Clear the form
      } else {
        setErrorData(data);
      }
    } catch (error: any) {
      setErrorData({ detail: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !buttonDisabled && !loading) {
      onSubmit();
    }
  };

  useEffect(() => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setButtonDisabled(!email || !emailRegex.test(email));
  }, [email]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center text-gray-800">
          {loading ? "Sending..." : "Reset Your Password"}
        </h1>
        
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <div className="space-y-5">
          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
              placeholder="Enter your email address"
              disabled={loading}
            />
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={buttonDisabled || loading}
          className={`mt-6 w-full py-2 px-4 rounded-lg font-medium transition ${
            buttonDisabled || loading
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-600 hover:underline">
            Remember your password? <span className="text-gray-900">Back to Login</span>
          </Link>
        </div>

        {successMessage && (
          <div className="mt-6 p-3 bg-green-50 text-green-700 rounded-md text-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p>{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {errorData && (
          <div className="mt-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                {Object.entries(errorData).map(([key, value], idx) => (
                  <p key={idx}>
                    <strong>{key}:</strong>{" "}
                    {Array.isArray(value) ? value.join(" ") : String(value)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
