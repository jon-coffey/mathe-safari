"use client";

import { useEffect, useRef, useState } from "react";
import HUD from "@/components/HUD";
import QuestionDisplay from "@/components/QuestionDisplay";
import Keypad from "@/components/Keypad";
import RewardSticker from "@/components/RewardSticker";
import { makeQuestion, formatQuestion, checkAnswer } from "@/lib/questions";
import { useSound } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSpeechNumber } from "@/lib/speech";

export default function ZeitPage() {
  const [running, setRunning] = useState(false);
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makeQuestion(10));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  // milestone changes every 10 correct answers
  const milestoneIndex = Math.floor(score / 10);
  const [rewardKey, setRewardKey] = useState<number | null>(null);
  const sound = useSound();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    setTimeLeft(duration);
  }, [duration, running]);

  useEffect(() => {
    if (!running) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        const next = Math.max(0, t - 1);
        if (next <= 5 && next > 0) sound.playTick();
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running, sound]);

  // const done = running && timeLeft === 0; // no longer used

  const onDigit = (d: number) => setInput((v) => (v + d).slice(0, 3));
  const onBackspace = () => setInput((v) => v.slice(0, -1));
  const handleAnswer = (val: number) => {
    if (!running) return;
    if (checkAnswer(q, val)) {
      setScore((s) => s + 1);
      setFeedback("correct");
      sound.playSuccess();
      setTimeout(() => {
        setFeedback(null);
        setQ(makeQuestion(10));
        setInput("");
      }, 300);
    } else {
      setFeedback("wrong");
      sound.playError();
      setTimeout(() => {
        setFeedback(null);
        setQ(makeQuestion(10));
        setInput("");
      }, 250);
    }
  };

  const onSubmit = () => {
    const val = parseInt(input || "-1");
    handleAnswer(val);
  };

  // subscribe to global speech numbers
  useSpeechNumber((n) => handleAnswer(n));

  const start = () => {
    setScore(0);
    setQ(makeQuestion(10));
    setInput("");
    setFeedback(null);
    setTimeLeft(duration);
    setRunning(true);
    setRewardKey(Date.now());
    try { window.localStorage.removeItem("rewardShuffle"); } catch {}
  };

  const stop = () => {
    setRunning(false);
  };
  return (
    <div>
      <HUD modeLabel="Zeitmodus" score={score} timeLeftSec={running ? timeLeft : undefined} totalTimeSec={duration} />

      {!running ? (
        <Card className="max-w-xl mx-auto p-6 mt-6 text-center">
          <div className="text-xl">Wähle die Dauer und starte die Runde.</div>
          <div className="mt-4 flex gap-2 justify-center">
            {[30, 45, 60, 90].map((n) => (
              <Button key={n} variant={duration === n ? "default" : "secondary"} onClick={() => setDuration(n)}>
                {n}s
              </Button>
            ))}
          </div>
          <Button className="mt-6 w-full text-xl py-7" onClick={start}>Start</Button>
        </Card>
      ) : timeLeft === 0 ? (
        <Card className="max-w-xl mx-auto p-6 mt-6 text-center">
          <div className="text-2xl font-bold">Zeit abgelaufen!</div>
          <div className="mt-2 text-lg">Punktestand: {score}</div>
          <div className="mt-4 flex gap-3 justify-center">
            <Button onClick={start}>Nochmal</Button>
            <Button variant="secondary" onClick={stop}>Beenden</Button>
          </div>
          <div className="mt-4 flex justify-center">
            <RewardSticker milestoneIndex={milestoneIndex} fixed={false} refreshKey={rewardKey ?? undefined} />
          </div>
        </Card>
      ) : (
        <>
          <QuestionDisplay question={formatQuestion(q)} input={input} feedback={feedback} />
          <div className="flex flex-col items-stretch justify-center gap-3 w-full max-w-sm mx-auto">
            <Keypad className="w-full" onDigit={onDigit} onBackspace={onBackspace} onSubmit={onSubmit} />
          </div>
        </>
      )}
    </div>
  );
}
