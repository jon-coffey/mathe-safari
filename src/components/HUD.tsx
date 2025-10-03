"use client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Star, Trophy } from "lucide-react";

export default function HUD({
  modeLabel,
  score,
  timeLeftSec,
  progress,
}: {
  modeLabel: string;
  score: number;
  timeLeftSec?: number;
  progress?: number; // 0..100
}) {
  return (
    <div className="w-full max-w-5xl mx-auto mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <Badge className="text-base px-3 py-1 bg-[#ff6b00] hover:bg-[#ff6b00]">{modeLabel}</Badge>
        </div>
        <div className="flex items-center gap-2 justify-end sm:justify-center">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <span className="text-xl font-bold" aria-live="polite">{score}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 justify-end">
          {typeof timeLeftSec === "number" && (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-sky-600" />
              <span className="text-lg font-semibold" aria-live="polite">{timeLeftSec}s</span>
            </div>
          )}
        </div>
      </div>
      {typeof progress === "number" && (
        <div className="mt-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <Progress value={progress} className="h-3" aria-label="Fortschritt" />
        </div>
      )}
    </div>
  );
}
