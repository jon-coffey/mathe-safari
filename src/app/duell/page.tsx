"use client";

import { useMemo, useState } from "react";
import HUD from "@/components/HUD";
import QuestionDisplay from "@/components/QuestionDisplay";
import Keypad from "@/components/Keypad";
import RewardSticker from "@/components/RewardSticker";
import { makeQuestion, formatQuestion, checkAnswer } from "@/lib/questions";
import { useSound } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSpeechNumber } from "@/lib/speech";

export default function DuellPage() {
  const sound = useSound();
  // Fixed 2 players with left/right layout
  const [setup, setSetup] = useState(true);
  const playersCount = 2;
  const [targetPoints, setTargetPoints] = useState(10);
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [turn, setTurn] = useState(0); // index of current player
  const [q, setQ] = useState(() => makeQuestion(10));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const milestoneIndex = Math.floor((scores[0] + scores[1]) / 10);

  const running = !setup;
  const scoreSum = useMemo(() => scores.slice(0, playersCount).reduce((a, b) => a + b, 0), [scores, playersCount]);

  const winnerIndex = scores.findIndex((s, i) => i < playersCount && s >= targetPoints);
  const hasWinner = winnerIndex !== -1;

  const onDigit = (d: number) => setInput((v) => (v + d).slice(0, 3));
  const onBackspace = () => setInput((v) => v.slice(0, -1));
  const nextTurn = () => setTurn((t) => (t + 1) % playersCount);

  const handleAnswer = (val: number) => {
    if (!running || hasWinner) return;
    if (checkAnswer(q, val)) {
      const ns = [...scores];
      ns[turn] += 1;
      setScores(ns);
      setFeedback("correct");
      sound.playSuccess();
      setTimeout(() => {
        setFeedback(null);
        setQ(makeQuestion(10));
        setInput("");
        if (!hasWinner) nextTurn();
      }, 250);
    } else {
      setFeedback("wrong");
      sound.playError();
      setTimeout(() => {
        setFeedback(null);
        setQ(makeQuestion(10));
        setInput("");
        nextTurn();
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
    setScores([0, 0]);
    setTurn(0);
    setQ(makeQuestion(10));
    setInput("");
    setFeedback(null);
    setSetup(false);
  };

  const reset = () => {
    setSetup(true);
  };

  return (
    <div className="pb-28">
      <HUD modeLabel="Duell" score={scoreSum} />

      {setup ? (
        <Card className="max-w-xl mx-auto p-6 mt-6">
          <div className="text-xl">Zielpunkte auswählen</div>
          <div className="mt-4 flex gap-2">
            {[5, 10, 15].map((n) => (
              <Button key={n} variant={targetPoints === n ? "default" : "secondary"} onClick={() => setTargetPoints(n)}>
                {n}
              </Button>
            ))}
          </div>
          <Button className="mt-6 w-full text-xl py-7" onClick={start}>Start</Button>
        </Card>
      ) : hasWinner ? (
        <Card className="max-w-xl mx-auto p-6 mt-6 text-center">
          <div className="text-2xl font-bold">Gewonnen!</div>
          <div className="mt-2 text-lg">Spieler {winnerIndex + 1} hat {scores[winnerIndex]} Punkte erreicht.</div>
          <div className="mt-4 flex gap-3 justify-center">
            <Button onClick={start}>Nochmal</Button>
            <Button variant="secondary" onClick={reset}>Zurück</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="max-w-5xl mx-auto mt-4 grid grid-cols-2 gap-3 items-start">
            {[0,1].map((i) => (
              <div key={i} className={`rounded-2xl p-4 text-center ${i === turn ? "bg-[#dbeafe] ring-4 ring-[#60a5fa]" : "bg-white/80"}`}>
                <div className="text-sm text-slate-600">Spieler {i + 1}</div>
                <div className="text-3xl font-extrabold">{scores[i]}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-2 text-lg">Am Zug: <b>Spieler {turn + 1}</b></div>
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
