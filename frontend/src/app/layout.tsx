import type { Metadata } from "next";
import { Inter, Geist_Mono } from 'next/font/google';
import "./globals.css";
// import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Social Media App',
  description: 'A modern social media platform with real-time features',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            {children}
          </div>
      </body>
    </html>
  );
}