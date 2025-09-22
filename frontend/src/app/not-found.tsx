"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50 text-gray-700">
      <h1 className="text-8xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6 text-gray-600">
        Oops! The page you're looking for doesn't exist.
      </p>

      <Link
        href="/"
        className="px-6 py-3 rounded-2xl bg-white/80 shadow-sm border border-gray-200 hover:bg-white hover:shadow-md transition"
      >
        Go Back Home
      </Link>
    </div>
  );
}
