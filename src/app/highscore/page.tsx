"use client";

import { useState } from "react";
import HUD from "@/components/HUD";
import QuestionDisplay from "@/components/QuestionDisplay";
import Keypad from "@/components/Keypad";
import RewardSticker from "@/components/RewardSticker";
import { makeQuestion, formatQuestion, checkAnswer } from "@/lib/questions";
import { useSound } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSpeechNumber } from "@/lib/speech";
import { getHighscore, setHighscore } from "@/lib/storage";

export default function HighscorePage() {
  const sound = useSound();
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [finished, setFinished] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [q, setQ] = useState(() => makeQuestion(10));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

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
        setQ(makeQuestion(10, { avoidAnswer: q.answer }));
        setInput("");
      }, 250);
    } else {
      setFeedback("wrong");
      sound.playError();
      setRunning(false);
      setFinished(true);
      setLastScore(score);
      const finalScore = score;
      const old = getHighscore();
      if (finalScore > old) {
        setHighscore(finalScore);
      }
      setBest(getHighscore());
    }
  };

  const onSubmit = () => {
    const val = parseInt(input || "-1");
    handleAnswer(val);
  };

  // subscribe to global speech numbers only when running
  useSpeechNumber((n) => {
    if (running) {
      handleAnswer(n);
    }
  });

  const start = () => {
    setBest(getHighscore());
    setScore(0);
    setQ(makeQuestion(10));
    setInput("");
    setFeedback(null);
    setFinished(false);
    setLastScore(null);
    try { window.localStorage.removeItem("rewardShuffle"); } catch {}
    setRunning(true);
  };

  return (
    <div className="pb-28">
      <HUD modeLabel="Highscore" score={score} />

      {!running ? (
        <Card className="max-w-xl mx-auto p-6 mt-6 text-center">
          {finished ? (
            <>
              <div className="text-2xl font-bold">Runde vorbei!</div>
              <div className="mt-2 text-lg">Punktestand: <b>{lastScore}</b></div>
              <div className="mt-4 flex justify-center">
                <RewardSticker milestoneIndex={Math.floor((lastScore ?? 0) / 10)} fixed={false} />
              </div>
              <div className="mt-4 flex gap-3 justify-center">
                <Button onClick={start}>Nochmal</Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xl">Schaffe so viele richtige Antworten wie möglich – bis zum ersten Fehler.</div>
              <div className="mt-4 text-lg">Dein Highscore: <b>{best}</b></div>
              <Button className="mt-6 w-full text-xl py-7" onClick={start}>Start</Button>
            </>
          )}
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
