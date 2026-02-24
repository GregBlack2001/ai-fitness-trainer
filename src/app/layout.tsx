import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FitAI - AI-Powered Personal Training",
  description:
    "Your intelligent fitness companion. Personalized workouts, nutrition plans, and coaching powered by AI.",
  keywords: [
    "fitness",
    "AI",
    "personal training",
    "workout",
    "nutrition",
    "health",
  ],
  authors: [{ name: "FitAI" }],
  openGraph: {
    title: "FitAI - AI-Powered Personal Training",
    description: "Your intelligent fitness companion",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f0a1e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-950 text-white min-h-screen`}
      >
        <div className="relative min-h-screen">
          {/* Background gradient effects */}
          <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-600/20 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 -left-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px]" />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
