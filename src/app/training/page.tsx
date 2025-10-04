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
import { Progress } from "@/components/ui/progress";

export default function TrainingPage() {
  const sound = useSound();
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makeQuestion(5));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [started, setStarted] = useState(false);
  const [startSeconds, setStartSeconds] = useState(10);
  const [minSeconds, setMinSeconds] = useState(3);
  const [allowedMs, setAllowedMs] = useState(startSeconds * 1000); // time per question
  const [timeLeftMs, setTimeLeftMs] = useState(startSeconds * 1000);
  const [answersCount, setAnswersCount] = useState(0);
  const [totalAnswerMs, setTotalAnswerMs] = useState(0);
  const timerRef = useRef<number | null>(null);

  const milestoneIndex = Math.floor(score / 10);
  const timeLeftSec = Math.max(0, Math.ceil(timeLeftMs / 1000));
  const percent = Math.max(0, Math.min(100, Math.round((timeLeftMs / allowedMs) * 100)));

  const resetTimer = (ms: number) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setTimeLeftMs(ms);
    timerRef.current = window.setInterval(() => {
      setTimeLeftMs((t) => {
        const next = t - 100;
        if (next <= 0) {
          window.clearInterval(timerRef.current!);
          timerRef.current = null;
        }
        return Math.max(0, next);
      });
    }, 100);
  };

  const onDigit = (d: number) => setInput((v) => (v + d).slice(0, 3));
  const onBackspace = () => setInput((v) => v.slice(0, -1));
  const handleAnswer = (val: number) => {
    const spent = Math.max(0, allowedMs - timeLeftMs);
    setAnswersCount((c) => c + 1);
    setTotalAnswerMs((t) => t + spent);
    if (checkAnswer(q, val) && timeLeftMs > 0) {
      setScore((s) => s + 1);
      setFeedback("correct");
      sound.playSuccess();
      const nextAllowed = Math.max(minSeconds * 1000, allowedMs - 300); // shrink per correct
      setAllowedMs(nextAllowed);
      setTimeout(() => {
        setFeedback(null);
        const nq = makeQuestion(10, { avoidAnswer: q.answer });
        setQ(nq);
        setInput("");
        resetTimer(nextAllowed);
      }, 200);
    } else {
      setFeedback("wrong");
      sound.playError();
      const nextAllowed = Math.min(startSeconds * 1000, allowedMs + 500); // increase time after mistake
      setAllowedMs(nextAllowed);
      setTimeout(() => {
        setFeedback(null);
        const nq = makeQuestion(10, { avoidAnswer: q.answer });
        setQ(nq);
        setInput("");
        resetTimer(nextAllowed);
      }, 200);
    }
  };
  const onSubmit = () => {
    const val = parseInt(input || "-1");
    handleAnswer(val);
  };

  // subscribe to global speech numbers only when started and time > 0
  useSpeechNumber((n) => {
    if (started && timeLeftMs > 0) {
      handleAnswer(n);
    }
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const start = () => {
    setScore(0);
    const initial = startSeconds * 1000;
    setAllowedMs(initial);
    const nq = makeQuestion(5);
    setQ(nq);
    setInput("");
    setFeedback(null);
    setStarted(true);
    setAnswersCount(0);
    setTotalAnswerMs(0);
    resetTimer(initial);
  };

  return (
    <div>
      <HUD modeLabel={`Training`} score={score} timeLeftSec={started ? timeLeftSec : undefined} />

      {!started ? (
        <Card className="max-w-xl mx-auto p-6 mt-6 text-center">
          <div className="text-xl">Beantworte jede Aufgabe innerhalb der Zeit. Bei jeder richtigen Antwort wird die Zeit kürzer.</div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div>
              <div className="font-semibold mb-2">Startzeit</div>
              <div className="flex flex-wrap gap-2">
                {[10,15,20,25,30].map((s) => (
                  <Button key={s} variant={startSeconds===s?"default":"secondary"} onClick={()=>setStartSeconds(s)} aria-pressed={startSeconds===s}>{s}s</Button>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">Minimalzeit</div>
              <div className="flex flex-wrap gap-2">
                {[3,5,8,13,21].map((s) => (
                  <Button key={s} variant={minSeconds===s?"default":"secondary"} onClick={()=>setMinSeconds(s)} aria-pressed={minSeconds===s}>{s}s</Button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={start} className="mt-6 w-full text-xl py-7">Start</Button>
        </Card>
      ) : timeLeftMs === 0 ? (
        <Card className="max-w-xl mx-auto p-6 mt-6 text-center">
          <div className="text-2xl font-bold">Zeit um!</div>
          <div className="mt-2 text-lg">Punktestand: <b>{score}</b></div>
          <div className="mt-4 flex justify-center">
            <RewardSticker milestoneIndex={milestoneIndex} fixed={false} />
          </div>
          <div className="mt-4 flex gap-3 justify-center">
            <Button onClick={start}>Nochmal</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="max-w-sm mx-auto mt-4">
            <Progress value={percent} className="h-3" aria-label="Zeit" />
            <div className="mt-2 text-center text-sm text-slate-600">Ø Antwortzeit: {(answersCount ? (totalAnswerMs/answersCount/1000) : 0).toFixed(1)}s</div>
          </div>
          <QuestionDisplay question={formatQuestion(q)} input={input} feedback={feedback} />
          <div className="flex flex-col items-stretch justify-center gap-3 w-full max-w-sm mx-auto">
            <Keypad className="w-full" onDigit={onDigit} onBackspace={onBackspace} onSubmit={onSubmit} />
          </div>
        </>
      )}
    </div>
  );
}
