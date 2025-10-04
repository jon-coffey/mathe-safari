"use client";
import { useEffect, useRef, useState } from "react";

const FALLBACK_GIFS = [
  "/animals/elefant.gif",
  "/animals/giraffe.gif",
  "/animals/loewe.gif",
  "/animals/zebra.gif",
  "/animals/affen.gif",
];

export default function RewardSticker({ milestoneIndex, fixed = true, refreshKey }: { milestoneIndex: number; fixed?: boolean; refreshKey?: string | number }) {
  const [src, setSrc] = useState<string>(FALLBACK_GIFS[0] || "");
  const lastMilestone = useRef<number>(-1);
  const orderRef = useRef<string[] | null>(null);

  useEffect(() => {
    // If refresh key changes, force a refetch and reshuffle
    orderRef.current = null;
  }, [refreshKey]);

  useEffect(() => {
    // Fetch available GIFs dynamically, then create or load a persisted shuffle order
    (async () => {
      if (!orderRef.current) {
        try {
          const res = await fetch("/api/animals", { cache: "no-store" });
          const data = await res.json();
          const list: string[] = Array.isArray(data?.urls) && data.urls.length > 0 ? data.urls : FALLBACK_GIFS;
          const saved = typeof window !== "undefined" ? window.localStorage.getItem("rewardShuffle") : null;
          let order = saved ? (JSON.parse(saved) as string[]) : null;
          const isSameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
          if (!order || !Array.isArray(order) || !isSameSet(order, list)) {
            order = [...list];
            for (let i = order.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [order[i], order[j]] = [order[j], order[i]];
            }
            window.localStorage.setItem("rewardShuffle", JSON.stringify(order));
          }
          orderRef.current = order;
          // update current src according to current milestone
          const local = order[milestoneIndex % order.length];
          setSrc(local);
        } catch {
          orderRef.current = [...FALLBACK_GIFS];
        }
      }
    })();
    if (milestoneIndex !== lastMilestone.current) {
      lastMilestone.current = milestoneIndex;
      const arr = orderRef.current ?? FALLBACK_GIFS;
      const local = arr[milestoneIndex % arr.length];
      setSrc(local);
    }
  }, [milestoneIndex]);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className={fixed ? "fixed bottom-4 right-4 z-40 select-none" : "select-none flex justify-center"}>
      <div className={fixed ? "bg-white/70 backdrop-blur rounded-2xl shadow p-2 animate-bounceIn" : "bg-white/70 backdrop-blur rounded-2xl shadow p-2"}>
        {children}
      </div>
    </div>
  );

  return (
    <Wrapper>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Belohnung"
          className="h-48 w-48 sm:h-64 sm:w-64 object-contain"
          onError={() => {
            // Only use local gifs: advance to next in local order
            const arr = orderRef.current ?? FALLBACK_GIFS;
            const next = (milestoneIndex + 1) % arr.length;
            setSrc(arr[next]);
          }}
        />
    </Wrapper>
  );
}
