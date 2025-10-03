"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

// Parse German numbers from text (simple, covers 0..99 common cases)
function parseGermanNumber(text: string): number | null {
  const t = text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .trim();

  const digits = t.match(/\d+/);
  if (digits) {
    const n = parseInt(digits[0], 10);
    if (!Number.isNaN(n)) return n;
  }
  const numbers: Record<string, number> = {
    null: 0,
    kein: 0,
    zero: 0,
    ein: 1,
    eins: 1,
    eine: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    fuenf: 5,
    sechs: 6,
    sieben: 7,
    acht: 8,
    neun: 9,
    zehn: 10,
    elf: 11,
    zwoelf: 12,
    dreizehn: 13,
    vierzehn: 14,
    fuenfzehn: 15,
    sechzehn: 16,
    siebzehn: 17,
    achtzehn: 18,
    neunzehn: 19,
    zwanzig: 20,
    dreissig: 30,
    vierzig: 40,
    fuenfzig: 50,
    sechzig: 60,
    siebzig: 70,
    achtzig: 80,
    neunzig: 90,
  };

  if (numbers[t] !== undefined) return numbers[t];

  // composites like "einundzwanzig", "zweiunddreissig"
  const units: Record<string, number> = {
    ein: 1,
    eins: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    fuenf: 5,
    funf: 5,
    sechs: 6,
    sieben: 7,
    acht: 8,
    neun: 9,
  };
  const tens: Record<string, number> = {
    zwanzig: 20,
    dreissig: 30,
    "dreißig": 30,
    vierzig: 40,
    fuenfzig: 50,
    funfzig: 50,
    sechzig: 60,
    siebzig: 70,
    achtzig: 80,
    neunzig: 90,
  };
  const m = t.match(/^(ein|eins|zwei|drei|vier|fuenf|funf|sechs|sieben|acht|neun)und(zwanzig|dreissig|dreißig|vierzig|fuenfzig|funfzig|sechzig|siebzig|achtzig|neunzig)$/);
  if (m) {
    const u = units[m[1]] ?? 0;
    const ten = tens[m[2]] ?? 0;
    return u + ten;
  }

  return null;
}

export default function SpeechInput({ onNumber }: { onNumber: (n: number) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const manualStopRef = useRef(false);

  useEffect(() => {
    const w: any = typeof window !== "undefined" ? window : {};
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Rec) setSupported(true);
  }, []);

  const handleResult = useCallback((e: any) => {
    const idx = e.resultIndex ?? 0;
    const text: string = (e.results?.[idx]?.[0]?.transcript || "").trim();
    const n = parseGermanNumber(text);
    if (n !== null) {
      onNumber(n);
    }
  }, [onNumber]);

  const start = () => {
    const w: any = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) return;
    manualStopRef.current = false;
    const rec = new Rec();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = handleResult;
    rec.onend = () => {
      if (!manualStopRef.current) {
        // restart for persistent listening
        try {
          rec.start();
        } catch {}
      } else {
        setListening(false);
      }
    };
    rec.onerror = () => {
      // attempt restart on recoverable errors
      if (!manualStopRef.current) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stop = () => {
    manualStopRef.current = true;
    try {
      recRef.current?.stop?.();
    } catch {}
    setListening(false);
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? "default" : "secondary"}
      size="lg"
      aria-label={listening ? "Spracheingabe beenden" : "Spracheingabe starten"}
      onClick={() => (listening ? stop() : start())}
      className="text-lg w-full sm:w-auto"
    >
      {listening ? <Mic className="h-5 w-5 mr-2" /> : <MicOff className="h-5 w-5 mr-2" />} 
      {listening ? "Hören…" : "Sprechen"}
    </Button>
  );
}
