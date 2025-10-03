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
  const [q, setQ] = useState(() => makeQuestion(10));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const milestoneIndex = Math.floor(score / 10);

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
      }, 250);
    } else {
      setFeedback("wrong");
      sound.playError();
      setRunning(false);
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

  // subscribe to global speech numbers
  useSpeechNumber((n) => handleAnswer(n));

  const start = () => {
    setBest(getHighscore());
    setScore(0);
    setQ(makeQuestion(10));
    setInput("");
    setFeedback(null);
    setRunning(true);
  };

  return (
    <div className="pb-28">
      <HUD modeLabel="Highscore" score={score} />

      {!running ? (
        <Card className="max-w-xl mx-auto p-6 mt-6 text-center">
          <div className="text-xl">Schaffe so viele richtige Antworten wie möglich – bis zum ersten Fehler.</div>
          <div className="mt-4 text-lg">Dein Highscore: <b>{best}</b></div>
          <Button className="mt-6 w-full text-xl py-7" onClick={start}>Start</Button>
        </Card>
      ) : (
        <>
          <QuestionDisplay question={formatQuestion(q)} input={input} feedback={feedback} />
          <div className="flex flex-col items-stretch justify-center gap-3 w-full max-w-sm mx-auto">
            <Keypad className="w-full" onDigit={onDigit} onBackspace={onBackspace} onSubmit={onSubmit} />
          </div>
        </>
      )}

      <RewardSticker milestoneIndex={milestoneIndex} />
    </div>
  );
}
