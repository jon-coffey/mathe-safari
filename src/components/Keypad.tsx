"use client";
import { Button } from "@/components/ui/button";

export default function Keypad({
  onDigit,
  onBackspace,
  onSubmit,
  disabled,
  className,
}: {
  onDigit: (d: number) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "bk", 0, "ok"] as const;
  return (
    <div className={`grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mx-auto mt-4 select-none ${className ?? ""}`}>
      {keys.map((k) => {
        if (k === "bk")
          return (
            <Button
              key="bk"
              type="button"
              variant="secondary"
              className="text-xl sm:text-2xl py-6 sm:py-8"
              disabled={disabled}
              onClick={onBackspace}
              aria-label="Löschen"
            >
              ⌫
            </Button>
          );
        if (k === "ok")
          return (
            <Button
              key="ok"
              type="button"
              className="text-xl sm:text-2xl py-6 sm:py-8 bg-[#22c55e] hover:bg-[#16a34a]"
              disabled={disabled}
              onClick={onSubmit}
              aria-label="Bestätigen"
            >
              OK
            </Button>
          );
        return (
          <Button
            key={k}
            type="button"
            className="text-xl sm:text-2xl py-6 sm:py-8"
            disabled={disabled}
            onClick={() => onDigit(k)}
            aria-label={`Zahl ${k}`}
          >
            {k}
          </Button>
        );
      })}
    </div>
  );
}
