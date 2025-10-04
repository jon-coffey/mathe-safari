"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HUD from "@/components/HUD";
import QuestionDisplay from "@/components/QuestionDisplay";
import Keypad from "@/components/Keypad";
import RewardSticker from "@/components/RewardSticker";
import { makeQuestion, formatQuestion, checkAnswer } from "@/lib/questions";
import { useSound } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSpeechNumber } from "@/lib/speech";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

export default function DuellPage() {
  const sound = useSound();
  // Fixed 2 players with left/right layout
  const [setup, setSetup] = useState(true);
  const playersCount = 2;
  const [targetPoints, setTargetPoints] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(20); // seconds
  const [mobileRotateMode, setMobileRotateMode] = useState(false);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [turn, setTurn] = useState(0); // index of current player
  const [q, setQ] = useState(() => makeQuestion(10));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const milestoneIndex = Math.floor((scores[0] + scores[1]) / 10);
  const [rewardKey, setRewardKey] = useState<number | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(timePerQuestion * 1000);
  const timerRef = useRef<number | null>(null);

  const running = !setup;
  const scoreSum = useMemo(() => scores.slice(0, playersCount).reduce((a, b) => a + b, 0), [scores, playersCount]);

  const winnerIndex = scores.findIndex((s, i) => i < playersCount && s >= targetPoints);
  const hasWinner = winnerIndex !== -1;
  const timePercent = Math.max(0, Math.min(100, (timeLeftMs / (timePerQuestion * 1000)) * 100));

  const resetTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setTimeLeftMs(timePerQuestion * 1000);
    timerRef.current = window.setInterval(() => {
      setTimeLeftMs((t) => {
        const next = t - 100;
        if (next <= 0) {
          window.clearInterval(timerRef.current!);
          timerRef.current = null;
          // Time's up - next player's turn
          setTimeout(() => {
            setQ(makeQuestion(10));
            setInput("");
            setTurn((prev) => (prev + 1) % playersCount);
            resetTimer();
          }, 500);
        }
        return Math.max(0, next);
      });
    }, 100);
  }, [timePerQuestion, playersCount]);

  useEffect(() => {
    if (running && !hasWinner) {
      resetTimer();
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running, hasWinner, turn, resetTimer]);

  const onDigit = (d: number) => setInput((v) => (v + d).slice(0, 3));
  const onBackspace = () => setInput((v) => v.slice(0, -1));
  const nextTurn = () => setTurn((t) => (t + 1) % playersCount);

  const handleAnswer = (val: number) => {
    if (!running || hasWinner || timeLeftMs <= 0) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (checkAnswer(q, val)) {
      const ns = [...scores];
      ns[turn] += 1;
      setScores(ns);
      setFeedback("correct");
      sound.playSuccess();
      setTimeout(() => {
        setFeedback(null);
        setQ(makeQuestion(10, { avoidAnswer: q.answer }));
        setInput("");
        if (!hasWinner) nextTurn();
      }, 250);
    } else {
      setFeedback("wrong");
      sound.playError();
      setTimeout(() => {
        setFeedback(null);
        setQ(makeQuestion(10, { avoidAnswer: q.answer }));
        setInput("");
        nextTurn();
      }, 250);
    }
  };

  const onSubmit = () => {
    const val = parseInt(input || "-1");
    handleAnswer(val);
  };

  // subscribe to global speech numbers only when running
  useSpeechNumber((n) => {
    if (running && !hasWinner && timeLeftMs > 0) {
      handleAnswer(n);
    }
  });

  const start = () => {
    setScores([0, 0]);
    setTurn(0);
    setQ(makeQuestion(10));
    setInput("");
    setFeedback(null);
    setRewardKey(Date.now());
    setTimeLeftMs(timePerQuestion * 1000);
    try { window.localStorage.removeItem("rewardShuffle"); } catch {}
    setSetup(false);
  };

  const reset = () => {
    setSetup(true);
  };

  return (
    <div className="pb-28">
      {!mobileRotateMode && <HUD modeLabel="Duell" score={scoreSum} />}

      {setup ? (
        <Card className="max-w-xl mx-auto p-6 mt-6">
          <div className="text-xl mb-4">Zielpunkte auswählen</div>
          <div className="flex gap-2">
            {[5, 10, 15].map((n) => (
              <Button key={n} variant={targetPoints === n ? "default" : "secondary"} onClick={() => setTargetPoints(n)}>
                {n}
              </Button>
            ))}
          </div>
          <div className="text-xl mt-6 mb-4">Zeit pro Frage</div>
          <div className="flex gap-2">
            {[10, 20, 30].map((n) => (
              <Button key={n} variant={timePerQuestion === n ? "default" : "secondary"} onClick={() => setTimePerQuestion(n)}>
                {n}s
              </Button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <label htmlFor="rotate-mode" className="text-base cursor-pointer">
              Mobile 180° Modus (Gegenübersitzen)
            </label>
            <Switch id="rotate-mode" checked={mobileRotateMode} onCheckedChange={setMobileRotateMode} />
          </div>
          <Button className="mt-6 w-full text-xl py-7" onClick={start}>Start</Button>
        </Card>
      ) : hasWinner ? (
        <Card className="max-w-xl mx-auto p-6 mt-6 text-center">
          <div className="text-2xl font-bold">Gewonnen!</div>
          <div className="mt-2 text-lg">Spieler {winnerIndex + 1} hat {scores[winnerIndex]} Punkte erreicht.</div>
          <div className="mt-4 flex justify-center">
            <RewardSticker milestoneIndex={milestoneIndex} fixed={false} refreshKey={rewardKey ?? undefined} />
          </div>
          <div className="mt-4 flex gap-3 justify-center">
            <Button onClick={start}>Nochmal</Button>
            <Button variant="secondary" onClick={reset}>Zurück</Button>
          </div>
        </Card>
      ) : (
        <>
          {mobileRotateMode ? (
            <div className="flex flex-col h-[calc(100vh-120px)]">
              {/* Player 1 area - normal orientation */}
              <div className="flex-1 flex flex-col justify-center pb-4 pt-4">
                <div className={`mx-auto w-full max-w-sm px-4 ${turn === 0 ? "" : "opacity-30"}`}>
                  <div className={`rounded-lg p-1.5 mb-2 text-center ${turn === 0 ? "bg-[#dbeafe] ring-2 ring-[#60a5fa]" : "bg-white/60"}`}>
                    <div className="text-xs text-slate-600">Spieler 1</div>
                    <div className="text-lg font-bold">{scores[0]}</div>
                  </div>
                  {turn === 0 && (
                    <>
                      <div className="mb-2">
                        <Progress value={timePercent} className="h-2" aria-label="Zeit" />
                      </div>
                      <QuestionDisplay question={formatQuestion(q)} input={input} feedback={feedback} />
                      <Keypad className="w-full" onDigit={onDigit} onBackspace={onBackspace} onSubmit={onSubmit} />
                    </>
                  )}
                </div>
              </div>
              
              {/* Player 2 area - 180° rotation */}
              <div className="flex-1 flex flex-col justify-center rotate-180 pt-4 sm:rotate-0 sm:pt-0 sm:pb-4">
                <div className={`mx-auto w-full max-w-sm px-4 sm:rotate-180 ${turn === 1 ? "" : "opacity-30"}`}>
                  <div className={`rounded-lg p-1.5 mb-2 text-center ${turn === 1 ? "bg-[#dbeafe] ring-2 ring-[#60a5fa]" : "bg-white/60"}`}>
                    <div className="text-xs text-slate-600">Spieler 2</div>
                    <div className="text-lg font-bold">{scores[1]}</div>
                  </div>
                  {turn === 1 && (
                    <>
                      <div className="mb-2">
                        <Progress value={timePercent} className="h-2" aria-label="Zeit" />
                      </div>
                      <QuestionDisplay question={formatQuestion(q)} input={input} feedback={feedback} />
                      <Keypad className="w-full" onDigit={onDigit} onBackspace={onBackspace} onSubmit={onSubmit} />
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="max-w-5xl mx-auto mt-4 grid grid-cols-2 gap-3 items-start">
                {[0,1].map((i) => (
                  <div key={i} className={`rounded-2xl p-3 sm:p-4 text-center ${i === turn ? "bg-[#dbeafe] ring-4 ring-[#60a5fa]" : "bg-white/80"}`}>
                    <div className="text-xs sm:text-sm text-slate-600">Spieler {i + 1}</div>
                    <div className="text-2xl sm:text-3xl font-extrabold">{scores[i]}</div>
                  </div>
                ))}
              </div>
              <div className="max-w-sm mx-auto mt-3">
                <Progress value={timePercent} className="h-3" aria-label="Zeit" />
              </div>
              <QuestionDisplay question={formatQuestion(q)} input={input} feedback={feedback} />
              <div className="flex flex-col items-stretch justify-center gap-3 w-full max-w-sm mx-auto">
                <Keypad className="w-full" onDigit={onDigit} onBackspace={onBackspace} onSubmit={onSubmit} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
