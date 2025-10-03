import type { Metadata } from "next";
import { Geist, Geist_Mono, Comic_Neue } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { SoundProvider } from "@/lib/sound";
import { SpeechProvider } from "@/lib/speech";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const comicNeue = Comic_Neue({
  variable: "--font-comic-neue",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Mathe Safari – Einmaleins Blitzrunden",
  description:
    "Kinderfreundliche Mathe-App: Einmaleins üben in Zeit-, Highscore-, Duell- und Trainingsmodus mit Belohnungen und Animationen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${comicNeue.variable} antialiased min-h-screen bg-gradient-to-br from-[#FFFBF0] via-[#FDF4FF] to-[#E0F7FA]`}
      >
        <SoundProvider>
          <SpeechProvider>
            <Header />
            <main className="container mx-auto px-4 pb-8">{children}</main>
          </SpeechProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
