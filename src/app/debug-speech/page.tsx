"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSpeech } from "@/lib/speech";

export default function DebugSpeechPage() {
  const speech = useSpeech();
  const [log, setLog] = useState<number[]>([]);
  const [transcripts, setTranscripts] = useState<{ text: string; isFinal: boolean; timestamp: number }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!speech.supported) return;
    const unsubscribe = speech.onNumber((n) => {
      setLog((prev) => [n, ...prev].slice(0, 30));
    });
    return unsubscribe;
  }, [speech]);

  useEffect(() => {
    if (!speech.supported) return;
    const unsub = speech.onTranscript((info) => {
      setTranscripts((prev) => [{ ...info, timestamp: Date.now() }, ...prev].slice(0, 50));
    });
    return unsub;
  }, [speech]);

  useEffect(() => {
    if (!speech.supported) return;
    const unsub = speech.onError((message) => {
      setErrors((prev) => [`${new Date().toLocaleTimeString()} – ${message}`, ...prev].slice(0, 20));
    });
    return unsub;
  }, [speech]);

  const toggle = () => {
    if (speech.listening) speech.stop();
    else speech.start();
  };

  const finalTranscript = useMemo(() => transcripts.find((t) => t.isFinal)?.text ?? "", [transcripts]);

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <Card className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Debug: Spracheingabe</h1>
        {!speech.supported ? (
          <div className="text-red-600">Dieses Gerät unterstützt keine lokale Spracheingabe (Vosk).</div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={toggle} disabled={speech.loading}>
                  {speech.loading ? "Lädt …" : speech.listening ? "Stop" : "Start"}
                </Button>
                <Button variant="secondary" onClick={() => setLog([])}>Log leeren</Button>
                <Button variant="secondary" onClick={() => setTranscripts([])}>Transkripte löschen</Button>
                <Button variant="secondary" onClick={() => setErrors([])}>Fehler löschen</Button>
              </div>
              {speech.loading && speech.progress !== null && (
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">Modell wird geladen …</div>
                  <Progress value={speech.progress} className="h-2" />
                </div>
              )}
              {!speech.ready && !speech.loading && speech.consentAccepted && (
                <div className="text-sm text-amber-600">Modell noch nicht bereit. Bitte warten …</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                Sprich eine Zahl zwischen 0 und 100. Die erkannte Zahl erscheint unten.
              </div>
              {speech.listening && (
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">Lautstärke</div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-75"
                      style={{ width: `${Math.min(100, speech.volume * 1000)}%` }}
                    />
                  </div>
                </div>
              )}
              {speech.error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                  {speech.error}
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="font-semibold">Letztes finales Transkript</div>
                <div className="min-h-[48px] bg-white rounded-lg p-3 border text-sm font-mono">
                  {finalTranscript || <span className="text-slate-400">–</span>}
                </div>
                <div className="text-xs text-slate-500">Letzte 5 Teilergebnisse</div>
                <ul className="space-y-1 text-xs">
                  {transcripts.slice(0, 5).map((t, idx) => (
                    <li key={idx}>
                      <span className="font-mono">{new Date(t.timestamp).toLocaleTimeString()}:</span> {t.text || <span className="text-slate-400">(leer)</span>} {t.isFinal ? "✔" : "…"}
                    </li>
                  ))}
                  {transcripts.length === 0 && <li className="text-slate-400">Noch keine Transkripte.</li>}
                </ul>
              </div>
              <div className="border rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="font-semibold">Fehler / Events</div>
                <ul className="space-y-1 text-xs">
                  {errors.slice(0, 8).map((e, idx) => (
                    <li key={idx} className="text-red-600 font-mono">{e}</li>
                  ))}
                  {errors.length === 0 && <li className="text-slate-400">Keine Fehler gemeldet.</li>}
                </ul>
              </div>
            </div>
            <div className="border rounded-xl p-3 h-60 overflow-auto bg-slate-50">
              {log.length === 0 ? (
                <div className="text-slate-400">Noch keine Zahlen erkannt.</div>
              ) : (
                <ul className="space-y-1">
                  {log.map((n, idx) => (
                    <li key={`${n}-${idx}`} className="font-mono text-lg">{n}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
