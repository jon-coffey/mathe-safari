"use client";
import { useEffect, useRef, useState } from "react";

const LOCAL_GIFS = [
  "/animals/elefant.gif",
  "/animals/giraffe.gif",
  "/animals/loewe.gif",
  "/animals/zebra.gif",
  "/animals/affen.gif",
];

export default function RewardSticker({ milestoneIndex }: { milestoneIndex: number }) {
  // Use a stable initial value to avoid hydration mismatches
  const [src, setSrc] = useState<string>(LOCAL_GIFS[0] || "");
  const lastMilestone = useRef<number>(-1);
  const orderRef = useRef<string[] | null>(null);

  useEffect(() => {
    // Initialize or load a persistent random order of local GIFs after mount
    if (!orderRef.current) {
      try {
        const saved = typeof window !== "undefined" ? window.localStorage.getItem("rewardShuffle") : null;
        let order = saved ? (JSON.parse(saved) as string[]) : null;
        if (!order || !Array.isArray(order) || order.length !== LOCAL_GIFS.length) {
          // create a new shuffle
          order = [...LOCAL_GIFS];
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
          window.localStorage.setItem("rewardShuffle", JSON.stringify(order));
        }
        orderRef.current = order;
      } catch {
        orderRef.current = [...LOCAL_GIFS];
      }
    }
    if (milestoneIndex !== lastMilestone.current) {
      lastMilestone.current = milestoneIndex;
      const arr = orderRef.current ?? LOCAL_GIFS;
      const local = arr[milestoneIndex % arr.length];
      setSrc(local);
    }
  }, [milestoneIndex]);

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none">
      <div className="bg-white/70 backdrop-blur rounded-2xl shadow p-2 animate-bounceIn">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Belohnung"
          className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
          onError={() => {
            // Only use local gifs: advance to next in local order
            const arr = orderRef.current ?? LOCAL_GIFS;
            const next = (milestoneIndex + 1) % arr.length;
            setSrc(arr[next]);
          }}
        />
      </div>
    </div>
  );
}
