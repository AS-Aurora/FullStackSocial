"use client";

import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    const key = params.get("key");
    if (key) {
      axios
        .post("http://localhost:8000/api/auth/registration/verify-email/", {
          key,
        })
        .then(() => {
          setStatus("Email verified successfully! You can now log in.");
        })
        .catch(() => {
          setStatus("Error verifying email. The link may be invalid or expired.");
        });
    } else {
      setStatus("No verification key provided.");
    }
  }, [params]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm rounded-xl p-8 text-center">
        <h1 className="text-2xl font-semibold mb-4 text-gray-800">
          Email Verification
        </h1>

        <p
          className={`text-base font-medium ${
            status.toLowerCase().includes("success")
              ? "text-green-600"
              : status.toLowerCase().includes("error") ||
                status.toLowerCase().includes("invalid")
              ? "text-red-600"
              : "text-gray-600"
          }`}
        >
          {status}
        </p>
      </div>
    </div>
  );
}
