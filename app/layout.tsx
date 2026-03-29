import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import "./globals.css";

const FirebaseAnalytics = dynamic(
  () => import("./FirebaseAnalytics").then((m) => ({ default: m.FirebaseAnalytics })),
  { ssr: false }
);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "PrepAI — AI interview coach",
  description:
    "Ace your next interview with an AI coach that actually listens. Practice with voice, get tailored questions, and receive a scored report.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} min-h-screen font-sans antialiased`}
      >
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
