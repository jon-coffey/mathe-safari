"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Home, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { useSound } from "@/lib/sound";
import { useSpeech } from "@/lib/speech";

function isFullscreen() {
  return typeof document !== "undefined" && !!document.fullscreenElement;
}

async function enterFullscreen() {
  try {
    await document.documentElement.requestFullscreen();
  } catch (e) {
    // ignore
  }
}

async function exitFullscreen() {
  try {
    await document.exitFullscreen();
  } catch (e) {
    // ignore
  }
}

export default function Header() {
  const soundCtx = useSound();
  const speech = useSpeech();
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const handler = () => setFs(isFullscreen());
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/70 border-b">      
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex">
            <Button variant="secondary" size="icon" aria-label="Startseite">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#ff6b00] drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">
            Mathe Safari
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {speech.supported && (
            <Button
              variant="secondary"
              size="icon"
              aria-label={speech.listening ? "Spracheingabe beenden" : "Spracheingabe starten"}
              onClick={() => speech.toggle()}
            >
              {speech.listening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            aria-label={fs ? "Vollbild verlassen" : "Vollbild betreten"}
            onClick={() => (fs ? exitFullscreen() : enterFullscreen())}
          >
            {fs ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label={soundCtx.enabled ? "Ton ausschalten" : "Ton einschalten"}
            onClick={() => soundCtx.toggle()}
          >
            {soundCtx.enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
