"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Infinity, Users2, Sparkles, Play, Mic } from "lucide-react";

export default function Home() {
  const tiles = [
    {
      href: "/zeit",
      color: "from-[#ffedd5] to-[#fed7aa]",
      icon: <Timer className="h-10 w-10" />,
      title: "Zeitmodus",
      desc: "So viele wie möglich!",
    },
    {
      href: "/highscore",
      color: "from-[#dcfce7] to-[#bbf7d0]",
      icon: <Infinity className="h-10 w-10" />,
      title: "Highscore",
      desc: "Endlos bis zum Fehler",
    },
    {
      href: "/duell",
      color: "from-[#e0f2fe] to-[#bae6fd]",
      icon: <Users2 className="h-10 w-10" />,
      title: "Duell",
      desc: "Gemeinsam am Gerät",
    },
    {
      href: "/training",
      color: "from-[#fae8ff] to-[#f5d0fe]",
      icon: <Sparkles className="h-10 w-10" />,
      title: "Training",
      desc: "Steigende Schwierigkeit",
    },
    {
      href: "/debug-speech",
      color: "from-[#fee2e2] to-[#fecaca]",
      icon: <Mic className="h-10 w-10" />,
      title: "Debug Modus",
      desc: "Spracheingabe testen",
    },
  ];

  return (
    <div className="pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto mt-8">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} aria-label={t.title}>
            <Card className={`p-6 rounded-3xl shadow-lg bg-gradient-to-br ${t.color} transition-transform hover:scale-[1.02] focus-within:ring-4 ring-[#60a5fa]` }>
              <div className="flex items-center gap-4">
                <div className="bg-white/70 rounded-2xl p-4">{t.icon}</div>
                <div className="flex-1">
                  <div className="text-2xl font-black">{t.title}</div>
                  <div className="text-[#475569] text-base">{t.desc}</div>
                </div>
                <Button size="lg" className="text-xl px-6">
                  <span className="hidden sm:inline">Los!</span>
                  <span className="inline-flex sm:hidden"><Play className="h-6 w-6" /></span>
                </Button>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
