import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PayPal Seller Agent",
  description: "AI operations agent for PayPal sellers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">
              Seller Agent
            </Link>
            <Link href="/" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
              Cases
            </Link>
            <Link href="/settings" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
              Rules
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
