"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const SOUND_KEY = "mathe-safari:sound-enabled";

type SoundContextType = {
  enabled: boolean;
  toggle: () => void;
  playSuccess: () => void;
  playError: () => void;
  playTick: () => void;
};

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SOUND_KEY);
      if (stored !== null) setEnabled(stored === "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
    } catch {}
  }, [enabled]);

  const ensureCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current!;
  };

  const playBeep = useCallback((freq: number, timeMs = 120, type: OscillatorType = "sine", gain = 0.06) => {
    if (!enabled) return;
    const ctx = ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      g.disconnect();
    }, timeMs);
  }, [enabled]);

  const playSuccess = useCallback(() => {
    // Try to play custom MP3 if available
    if (enabled) {
      try {
        const a = new Audio("/sounds/success.mp3");
        a.volume = 0.8;
        a.play().catch(() => {
          // fallback to synth beeps
          playBeep(440, 90, "triangle");
          setTimeout(() => playBeep(660, 100, "triangle"), 90);
          setTimeout(() => playBeep(880, 120, "triangle"), 180);
        });
        return;
      } catch {}
    }
    // fallback if disabled or error
    playBeep(440, 90, "triangle");
    setTimeout(() => playBeep(660, 100, "triangle"), 90);
    setTimeout(() => playBeep(880, 120, "triangle"), 180);
  }, [enabled, playBeep]);

  const playError = useCallback(() => {
    playBeep(200, 160, "sawtooth");
    setTimeout(() => playBeep(150, 180, "sawtooth"), 130);
  }, [playBeep]);

  const playTick = useCallback(() => {
    playBeep(800, 40, "square", 0.04);
  }, [playBeep]);

  const value = useMemo<SoundContextType>(() => ({
    enabled,
    toggle: () => setEnabled((v) => !v),
    playSuccess,
    playError,
    playTick,
  }), [enabled, playError, playSuccess, playTick]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
