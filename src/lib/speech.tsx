"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Simple German number parser 0..99 (digits, words, composites like einundzwanzig)
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
  const base: Record<string, number> = {
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
    funf: 5,
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
    "dreißig": 30,
    vierzig: 40,
    fuenfzig: 50,
    funfzig: 50,
    sechzig: 60,
    siebzig: 70,
    achtzig: 80,
    neunzig: 90,
  };
  if (base[t] !== undefined) return base[t];
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
    return (units[m[1]] ?? 0) + (tens[m[2]] ?? 0);
  }
  return null;
}

export type SpeechContextValue = {
  supported: boolean;
  listening: boolean;
  toggle: () => void;
  start: () => void;
  stop: () => void;
  // Register a callback for recognized numbers; returns unsubscribe
  onNumber: (cb: (n: number) => void) => () => void;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const manualStopRef = useRef(false);
  const subsRef = useRef(new Set<(n: number) => void>());

  useEffect(() => {
    const w: any = typeof window !== "undefined" ? window : {};
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Rec) setSupported(true);
  }, []);

  const emit = (n: number) => subsRef.current.forEach((cb) => cb(n));

  const handleResult = useCallback((e: any) => {
    const idx = e.resultIndex ?? 0;
    const text: string = (e.results?.[idx]?.[0]?.transcript || "").trim();
    const n = parseGermanNumber(text);
    if (n !== null) emit(n);
  }, []);

  const start = useCallback(async () => {
    const w: any = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) return;
    manualStopRef.current = false;
    // Preflight mic permission (helps some browsers)
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (e) {
      // user may deny; SpeechRecognition could still prompt
    }
    if (!recRef.current) {
      recRef.current = new Rec();
      recRef.current.lang = "de-DE";
      recRef.current.continuous = true;
      recRef.current.interimResults = false;
      recRef.current.onresult = handleResult;
      recRef.current.onstart = () => setListening(true);
      recRef.current.onend = () => {
        if (!manualStopRef.current) {
          try { recRef.current.start(); } catch { setListening(false); }
        } else {
          setListening(false);
        }
      };
      recRef.current.onerror = (ev: any) => {
        const name = ev?.error || "";
        // If permission denied or service not allowed, stop retrying
        if (name === "not-allowed" || name === "service-not-allowed") {
          manualStopRef.current = true;
          setListening(false);
          try { recRef.current.stop(); } catch {}
          return;
        }
        if (!manualStopRef.current) {
          try { recRef.current.start(); } catch { setListening(false); }
        } else {
          setListening(false);
        }
      };
    }
    try {
      // Ensure we don't call start twice
      try { recRef.current.stop(); } catch {}
      recRef.current.start();
      // listening will flip true on onstart
    } catch {
      setListening(false);
    }
  }, [handleResult]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    try { recRef.current?.stop?.(); } catch {}
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  const onNumber = useCallback((cb: (n: number) => void) => {
    subsRef.current.add(cb);
    return () => subsRef.current.delete(cb);
  }, []);

  const value = useMemo<SpeechContextValue>(() => ({ supported, listening, toggle, start, stop, onNumber }), [supported, listening, toggle, start, stop, onNumber]);

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) throw new Error("useSpeech must be used within SpeechProvider");
  return ctx;
}

export function useSpeechNumber(handler: (n: number) => void) {
  const ctx = useSpeech();
  useEffect(() => ctx.onNumber(handler), [ctx, handler]);
}
