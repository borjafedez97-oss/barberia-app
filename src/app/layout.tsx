import type { Metadata } from "next";
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

export const metadata = {
  title: "JBarbers Piornal",
  description: "Barbería en Piornal",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
     lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased notranslate`}
      translate="no"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
