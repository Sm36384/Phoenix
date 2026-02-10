import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transformation Pulse Global",
  description: "Signal-driven intelligence for $1B+ digital transformation mandates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
