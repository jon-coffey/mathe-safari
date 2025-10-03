"use client";
import { useEffect } from "react";

export default function RewardOverlay({
  visible,
  imageUrl,
  onHide,
}: {
  visible: boolean;
  imageUrl: string;
  onHide?: () => void;
}) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onHide && onHide(), 1200);
    return () => clearTimeout(t);
  }, [visible, onHide]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
      <div className="bg-white/60 backdrop-blur rounded-2xl shadow-xl p-3 animate-bounceIn">
        <img
          src={imageUrl}
          alt="Tolle Leistung!"
          className="h-48 w-48 object-contain drop-shadow-lg"
        />
      </div>
    </div>
  );
}
