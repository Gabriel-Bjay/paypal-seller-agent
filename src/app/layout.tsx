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
        <nav className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3 text-sm">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">SA</span>
              <span>
                <span className="block font-semibold leading-tight">Seller Agent</span>
                <span className="block text-xs leading-tight text-neutral-500">AI dispute resolution for PayPal sellers</span>
              </span>
            </Link>
            <Link href="/" className="font-medium text-neutral-600 hover:text-indigo-700">
              Cases
            </Link>
            <Link href="/settings" className="font-medium text-neutral-600 hover:text-indigo-700">
              Rules
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
