import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Global Digital Monument — Leave Your Light on Earth",
  description:
    "An immersive, cinematic interactive monument where people around the world unite to leave a glowing light on our shared planet.",
  keywords: ["global monument", "digital earth", "interactive globe", "cesium", "human unity", "3d earth"],
  openGraph: {
    title: "Global Digital Monument",
    description: "Leave your permanent glowing light on Earth. One planet, millions of stories.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full dark`}>
      <body
        suppressHydrationWarning
        className="min-h-full bg-[#030407] text-[#F5F7FA] font-sans antialiased overflow-hidden select-none"
      >
        {children}
      </body>
    </html>
  );
}
