/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { createModel, type KaldiRecognizer, type Model } from "vosk-browser";

const MODEL_URL = "/models/vosk-model-small-de-0.15.tar.gz";
const DEFAULT_SAMPLE_RATE = 16000;
const CONSENT_STORAGE_KEY = "speech-consent-v1";

export type TranscriptInfo = {
  text: string;
  isFinal: boolean;
  timestamp: number;
};

// Simple German number parser 0..100 (digits, words, composites like einundzwanzig)
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
    if (!Number.isNaN(n)) return n >= 0 && n <= 100 ? n : null;
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
    dreißig: 30,
    vierzig: 40,
    fuenfzig: 50,
    funfzig: 50,
    sechzig: 60,
    siebzig: 70,
    achtzig: 80,
    neunzig: 90,
    hundert: 100,
    einhundert: 100,
  };
  if (base[t] !== undefined) {
    const value = base[t];
    return value >= 0 && value <= 100 ? value : null;
  }
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
    dreißig: 30,
    vierzig: 40,
    fuenfzig: 50,
    funfzig: 50,
    sechzig: 60,
    siebzig: 70,
    achtzig: 80,
    neunzig: 90,
  };
  const m = t.match(
    /^(ein|eins|zwei|drei|vier|fuenf|funf|sechs|sieben|acht|neun)und(zwanzig|dreissig|dreißig|vierzig|fuenfzig|funfzig|sechzig|siebzig|achtzig|neunzig)$/
  );
  if (m) {
    const value = (units[m[1]] ?? 0) + (tens[m[2]] ?? 0);
    return value >= 0 && value <= 100 ? value : null;
  }
  return null;
}

export type SpeechContextValue = {
  supported: boolean;
  listening: boolean;
  ready: boolean;
  loading: boolean;
  progress: number | null;
  volume: number;
  error: string | null;
  consentOpen: boolean;
  consentAccepted: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  openConsent: () => void;
  acceptConsent: () => void;
  declineConsent: () => void;
  resetError: () => void;
  onNumber: (cb: (n: number) => void) => () => void;
  onTranscript: (cb: (info: TranscriptInfo) => void) => () => void;
  onError: (cb: (message: string) => void) => () => void;
  onVolume: (cb: (value: number) => void) => () => void;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const numberSubsRef = useRef(new Set<(n: number) => void>());
  const transcriptSubsRef = useRef(new Set<(info: TranscriptInfo) => void>());
  const errorSubsRef = useRef(new Set<(message: string) => void>());
  const volumeSubsRef = useRef(new Set<(value: number) => void>());

  const modelRef = useRef<Model | null>(null);
  const recognizerRef = useRef<KaldiRecognizer | null>(null);
  const modelUrlRef = useRef<string | null>(null);
  const loadPromiseRef = useRef<Promise<Model> | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const listeningRef = useRef(false);
  const pendingStartRef = useRef(false);
  const lastEmittedNumberRef = useRef<{ value: number; timestamp: number } | null>(null);
  const pendingNumberTimerRef = useRef<number | null>(null);
  const pendingNumberRef = useRef<number | null>(null);

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      (typeof AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined") &&
      typeof Worker !== "undefined";
    setSupported(isSupported);
  }, []);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored === "1") {
        setConsentAccepted(true);
      }
    } catch (e) {
      console.warn("Konnte Speech-Consent nicht aus localStorage lesen", e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (consentAccepted) {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, "1");
      } else {
        window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Konnte Speech-Consent nicht im localStorage speichern", e);
    }
  }, [consentAccepted]);

  const emitNumber = useCallback((value: number) => {
    const now = Date.now();
    const last = lastEmittedNumberRef.current;
    
    // Debounce: Ignoriere die gleiche Zahl innerhalb von 1500ms
    if (last && last.value === value && now - last.timestamp < 1500) {
      console.log(`[Speech] Debounce: Zahl ${value} wurde vor ${now - last.timestamp}ms bereits erkannt, ignoriere`);
      return;
    }
    
    // Clear any pending number timer
    if (pendingNumberTimerRef.current) {
      window.clearTimeout(pendingNumberTimerRef.current);
      console.log(`[Speech] Vorherige Zahl ${pendingNumberRef.current} verworfen, ersetze durch ${value}`);
    }
    
    // Store the new number and wait 350ms before emitting
    // This allows "drei" to be replaced by "dreißig" if spoken as one word
    pendingNumberRef.current = value;
    console.log(`[Speech] Erkannte Zahl ${value}, warte 350ms auf Vervollständigung...`);
    
    pendingNumberTimerRef.current = window.setTimeout(() => {
      const finalValue = pendingNumberRef.current;
      if (finalValue !== null) {
        console.log(`[Speech] Emittiere Zahl: ${finalValue}`);
        lastEmittedNumberRef.current = { value: finalValue, timestamp: Date.now() };
        numberSubsRef.current.forEach((cb) => cb(finalValue));
        pendingNumberRef.current = null;
      }
      pendingNumberTimerRef.current = null;
    }, 350);
  }, []);

  const emitTranscript = useCallback((info: TranscriptInfo) => {
    transcriptSubsRef.current.forEach((cb) => cb(info));
  }, []);

  const emitError = useCallback((message: string) => {
    setError(message);
    errorSubsRef.current.forEach((cb) => cb(message));
  }, []);

  const emitVolume = useCallback((value: number) => {
    setVolume(value);
    volumeSubsRef.current.forEach((cb) => cb(value));
  }, []);

  const cleanupAudio = useCallback(() => {
    console.log('[Speech] Bereinige Audio-Ressourcen');
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try { processorRef.current.disconnect(); } catch {}
      processorRef.current = null;
    }
    if (gainRef.current) {
      try { gainRef.current.disconnect(); } catch {}
      gainRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      cleanupAudio();
      recognizerRef.current?.remove?.();
      recognizerRef.current = null;
      if (modelRef.current) {
        modelRef.current.terminate();
        modelRef.current = null;
      }
      if (modelUrlRef.current) {
        URL.revokeObjectURL(modelUrlRef.current);
        modelUrlRef.current = null;
      }
    },
    [cleanupAudio]
  );

  const loadModel = useCallback(async (): Promise<Model> => {
    if (modelRef.current && modelRef.current.ready) {
      return modelRef.current;
    }
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    const promise = (async () => {
      setLoading(true);
      setProgress(0);
      setError(null);
      try {
        const response = await fetch(MODEL_URL);
        if (!response.ok) {
          throw new Error(`Modell konnte nicht geladen werden (HTTP ${response.status})`);
        }
        const contentLength = Number(response.headers.get("content-length") ?? "0");
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              if (contentLength) {
                setProgress(Math.min(100, Math.round((received / contentLength) * 100)));
              }
            }
          }
        }
        if (!chunks.length) {
          const buffer = await response.arrayBuffer();
          chunks.push(new Uint8Array(buffer));
          received = chunks[0].length;
        }
        if (!contentLength && received) {
          setProgress(80);
        }
        const blob = new Blob(chunks as BlobPart[], { type: "application/gzip" });
        if (modelUrlRef.current) {
          URL.revokeObjectURL(modelUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(blob);
        modelUrlRef.current = objectUrl;
        console.log('[Speech] Starte Vosk-Modell-Initialisierung...');
        setProgress(90);
        const model = await createModel(objectUrl, 0);
        console.log('[Speech] Vosk-Modell erfolgreich geladen, ready:', model.ready);
        modelRef.current = model;
        
        // Warte bis Model wirklich ready ist
        if (!model.ready) {
          console.warn('[Speech] Model geladen aber noch nicht ready, warte auf load event...');
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout beim Warten auf Model-Bereitschaft'));
            }, 30000);
            model.on('load', (msg: any) => {
              clearTimeout(timeout);
              console.log('[Speech] Model load event empfangen:', msg);
              if (msg.result) {
                resolve();
              } else {
                reject(new Error('Model konnte nicht geladen werden'));
              }
            });
            model.on('error', (msg: any) => {
              clearTimeout(timeout);
              console.error('[Speech] Model error event:', msg);
              reject(new Error(msg.error || 'Model-Fehler'));
            });
          });
        }
        
        setReady(true);
        setProgress(100);
        setTimeout(() => setProgress(null), 500);
        console.log('[Speech] Modell ist jetzt bereit');
        return model;
      } finally {
        setLoading(false);
        loadPromiseRef.current = null;
      }
    })().catch((err) => {
      console.error('[Speech] Fehler beim Laden des Modells:', err);
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Laden des Sprachmodells.";
      emitError(message);
      setProgress(null);
      setLoading(false);
      setReady(false);
      throw err;
    });

    loadPromiseRef.current = promise;
    return promise;
  }, [emitError]);

  const ensureRecognizer = useCallback(
    async (sampleRate: number) => {
      const model = await loadModel();
      if (recognizerRef.current) {
        recognizerRef.current.remove();
        recognizerRef.current = null;
      }
      console.log('[Speech] Erstelle KaldiRecognizer mit sampleRate:', sampleRate);
      const recognizer = new model.KaldiRecognizer(sampleRate);
      recognizer.setWords(true);
      console.log('[Speech] KaldiRecognizer erstellt mit ID:', recognizer.id);
      recognizer.on("partialresult", (message: any) => {
        const text = message?.result?.partial ?? "";
        emitTranscript({ text, isFinal: false, timestamp: Date.now() });
        // Prüfe auch partial results auf Zahlen für schnellere Reaktion
        const n = parseGermanNumber(text);
        if (n !== null) emitNumber(n);
      });
      recognizer.on("result", (message: any) => {
        const text: string = message?.result?.text ?? "";
        emitTranscript({ text, isFinal: true, timestamp: Date.now() });
        const n = parseGermanNumber(text);
        if (n !== null) emitNumber(n);
      });
      recognizer.on("error", (message: any) => {
        const errMsg = message?.error ?? "Unbekannter Fehler im Sprach-Recognizer";
        emitError(errMsg);
      });
      recognizerRef.current = recognizer;
      return recognizer;
    },
    [emitError, emitNumber, emitTranscript, loadModel]
  );

  const stopInternal = useCallback(() => {
    cleanupAudio();
    if (recognizerRef.current) {
      try {
        recognizerRef.current.retrieveFinalResult();
      } catch (e) {
        console.warn("Fehler beim Abrufen des finalen Ergebnisses", e);
      }
      recognizerRef.current.remove();
      recognizerRef.current = null;
    }
    listeningRef.current = false;
    setListening(false);
    pendingStartRef.current = false;
    lastEmittedNumberRef.current = null; // Reset debounce beim Stoppen
    
    // Clear pending number timer
    if (pendingNumberTimerRef.current) {
      window.clearTimeout(pendingNumberTimerRef.current);
      pendingNumberTimerRef.current = null;
    }
    pendingNumberRef.current = null;
    
    emitVolume(0);
  }, [cleanupAudio, emitVolume]);

  const startInternal = useCallback(async () => {
    if (!supported) {
      emitError("Dieses Gerät unterstützt keine lokale Spracheingabe.");
      return;
    }
    if (listeningRef.current || pendingStartRef.current) return;
    if (!consentAccepted) {
      pendingStartRef.current = true;
      setConsentOpen(true);
      return;
    }

    pendingStartRef.current = false;
    setError(null);

    try {
      const model = await loadModel();

      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      if (!AudioCtx) {
        throw new Error("AudioContext wird nicht unterstützt.");
      }

      const audioContext = new AudioCtx({ sampleRate: DEFAULT_SAMPLE_RATE });
      audioContextRef.current = audioContext;

      console.log('[Speech] Fordere Mikrofon-Zugriff an...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: audioContext.sampleRate,
        },
        video: false,
      });
      streamRef.current = stream;
      console.log('[Speech] Mikrofon-Zugriff erhalten');

      await ensureRecognizer(audioContext.sampleRate);

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (!recognizerRef.current) return;
        const buffer = event.inputBuffer;
        try {
          recognizerRef.current.acceptWaveform(buffer);
        } catch (e) {
          console.warn('[Speech] acceptWaveform fehlgeschlagen', e);
        }
        const data = buffer.getChannelData(0);
        let total = 0;
        for (let i = 0; i < data.length; i += 1) {
          total += data[i] * data[i];
        }
        const rms = Math.sqrt(total / data.length);
        emitVolume(Number.isFinite(rms) ? rms : 0);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      
      console.log('[Speech] Audio-Pipeline verbunden, AudioContext-State:', audioContext.state);

      listeningRef.current = true;
      setListening(true);
      setReady(model.ready);

      if (audioContext.state === "suspended") {
        console.log('[Speech] AudioContext ist suspended, versuche resume...');
        await audioContext.resume();
        console.log('[Speech] AudioContext resumed, neuer State:', audioContext.state);
      }
      
      console.log('[Speech] Spracheingabe aktiv, bereit für Audio-Verarbeitung');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Start der Spracheingabe.";
      emitError(message);
      stopInternal();
    }
  }, [consentAccepted, emitError, emitVolume, ensureRecognizer, loadModel, stopInternal, supported]);

  const start = useCallback(() => {
    void startInternal();
  }, [startInternal]);

  const stop = useCallback(() => {
    stopInternal();
  }, [stopInternal]);

  const toggle = useCallback(() => {
    if (listeningRef.current) {
      stopInternal();
    } else {
      void startInternal();
    }
  }, [startInternal, stopInternal]);

  const openConsent = useCallback(() => {
    setConsentOpen(true);
  }, []);

  const acceptConsent = useCallback(() => {
    setConsentAccepted(true);
    setConsentOpen(false);
    if (pendingStartRef.current) {
      pendingStartRef.current = false;
      void startInternal();
    }
  }, [startInternal]);

  const declineConsent = useCallback(() => {
    setConsentOpen(false);
    pendingStartRef.current = false;
    setConsentAccepted(false);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const onNumber = useCallback((cb: (n: number) => void) => {
    numberSubsRef.current.add(cb);
    return () => numberSubsRef.current.delete(cb);
  }, []);

  const onTranscript = useCallback((cb: (info: TranscriptInfo) => void) => {
    transcriptSubsRef.current.add(cb);
    return () => transcriptSubsRef.current.delete(cb);
  }, []);

  const onError = useCallback((cb: (message: string) => void) => {
    errorSubsRef.current.add(cb);
    return () => errorSubsRef.current.delete(cb);
  }, []);

  const onVolumeHook = useCallback((cb: (value: number) => void) => {
    volumeSubsRef.current.add(cb);
    return () => volumeSubsRef.current.delete(cb);
  }, []);

  const value = useMemo<SpeechContextValue>(
    () => ({
      supported,
      listening,
      ready,
      loading,
      progress,
      volume,
      error,
      consentOpen,
      consentAccepted,
      start,
      stop,
      toggle,
      openConsent,
      acceptConsent,
      declineConsent,
      resetError,
      onNumber,
      onTranscript,
      onError,
      onVolume: onVolumeHook,
    }),
    [
      supported,
      listening,
      ready,
      loading,
      progress,
      volume,
      error,
      consentOpen,
      consentAccepted,
      start,
      stop,
      toggle,
      openConsent,
      acceptConsent,
      declineConsent,
      resetError,
      onNumber,
      onTranscript,
      onError,
      onVolumeHook,
    ]
  );

  return (
    <SpeechContext.Provider value={value}>
      {children}
      <Dialog
        open={consentOpen}
        onOpenChange={(open) => {
          setConsentOpen(open);
          if (!open && !consentAccepted) {
            pendingStartRef.current = false;
          }
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Spracheingabe aktivieren</DialogTitle>
            <DialogDescription>
              Für die lokale Erkennung wird das Vosk-Modell geladen (ca. 50&nbsp;MB). Das passiert nur einmal pro Gerät.
              Danach läuft die Spracheingabe komplett offline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              Bitte bestätige, dass das Modell heruntergeladen werden darf. Während des Downloads siehst du den Fortschritt.
            </p>
            {loading ? (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">Lade Modell …</div>
                <Progress value={progress ?? 0} className="h-2" />
              </div>
            ) : (
              <p>
                Das Modell bleibt lokal gespeichert. Es werden keine Audio-Daten ins Internet übertragen.
              </p>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                {error}
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={declineConsent} disabled={loading}>
              Abbrechen
            </Button>
            <Button onClick={acceptConsent} disabled={loading}>
              {loading ? "Lädt …" : "Akzeptieren & Laden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div role="status" aria-live="polite" className="sr-only">
        {error ? `Fehler bei der Spracheingabe: ${error}` : listening ? "Spracheingabe aktiv" : "Spracheingabe inaktiv"}
      </div>
    </SpeechContext.Provider>
  );
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
