"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const getUrlParams = () => {
    let uid = searchParams.get('uid');
    let token = searchParams.get('token');
    
    if (!token && typeof window !== 'undefined') {
      const url = window.location.href;
      const uidMatch = url.match(/uid=([^&]+)/);
      const tokenMatch = url.match(/token=([^&]+)/);
      
      if (uidMatch) uid = decodeURIComponent(uidMatch[1]);
      if (tokenMatch) token = decodeURIComponent(tokenMatch[1]);
    }
    
    return { uid, token };
  };
  
  const { uid, token } = getUrlParams();
  
  const [formData, setFormData] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [errorData, setErrorData] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      setErrorData(null);
      setSuccessMessage("");

      if (!uid || !token) {
        setErrorData({ detail: "Invalid reset link. Please request a new password reset." });
        return;
      }

      const response = await axios.post(
        "http://localhost:8000/api/auth/password-reset-confirm/",
        {
          uid,
          token,
          new_password: formData.new_password,
          confirm_password: formData.confirm_password,
        }
      );

      const data = response.data;
      setSuccessMessage(data.message || "Password reset successfully!");
      setFormData({ new_password: "", confirm_password: "" });
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.response?.data) {
        setErrorData(error.response.data);
      } else {
        setErrorData({ detail: "An error occurred. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !buttonDisabled && !loading) {
      onSubmit();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const isValid = formData.new_password.length >= 8 && 
                   formData.confirm_password.length >= 8 && 
                   formData.new_password === formData.confirm_password;
    setButtonDisabled(!isValid);
  }, [formData]);

  if (!uid || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm rounded-xl p-8">
          <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">
            Invalid Reset Link
          </h1>
          
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm mb-6">
            <p>This password reset link is invalid or has expired.</p>
          </div>

          <div className="space-y-3">
            <Link href="/forgot-password" className="block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Request New Reset Link
            </Link>
            <Link href="/test-reset" className="block w-full text-center py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
              Test Reset Flow
            </Link>
            <Link href="/login" className="block text-center text-sm text-gray-600 hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center text-gray-800">
          {loading ? "Resetting..." : "Reset Your Password"}
        </h1>
        
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your new password below.
        </p>

        <div className="space-y-5">
          <div>
            <input
              id="new_password"
              type="password"
              value={formData.new_password}
              onChange={(e) => handleInputChange("new_password", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
              placeholder="New password (min. 8 characters)"
              disabled={loading}
            />
          </div>
          
          <div>
            <input
              id="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={(e) => handleInputChange("confirm_password", e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black placeholder-gray-400"
              placeholder="Confirm new password"
              disabled={loading}
            />
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className={`text-xs flex items-center ${formData.new_password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="mr-2">
              {formData.new_password.length >= 8 ? '✓' : '○'}
            </span>
            At least 8 characters
          </div>
          <div className={`text-xs flex items-center ${formData.new_password && formData.confirm_password && formData.new_password === formData.confirm_password ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="mr-2">
              {formData.new_password && formData.confirm_password && formData.new_password === formData.confirm_password ? '✓' : '○'}
            </span>
            Passwords match
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
          {loading ? "Resetting..." : "Reset Password"}
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
                <p className="text-sm mt-1">Redirecting to login page...</p>
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
