import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClampFi - Supply-Clamping Token Launchpad",
  description:
    "Launch and trade tokens on CoreDAO with mathematically impossible rug pulls",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-[#0A0A0A] bg-mesh min-h-screen`}
      >
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
