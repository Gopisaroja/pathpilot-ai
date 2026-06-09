import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PathPilot AI — Student Career Copilot",
  description: "From Dream Job to Action Plan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
