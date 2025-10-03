"use client";

export default function QuestionDisplay({
  question,
  input,
  feedback,
}: {
  question: string;
  input: string;
  feedback?: "correct" | "wrong" | null;
}) {
  return (
    <div
      className={
        "w-full max-w-3xl mx-auto text-center mt-6 p-6 rounded-3xl bg-white/80 shadow " +
        (feedback === "correct"
          ? "ring-4 ring-green-400 animate-tada"
          : feedback === "wrong"
          ? "ring-4 ring-red-400 animate-headShake"
          : "")
      }
    >
      <div className="text-5xl sm:text-7xl font-extrabold text-[#0f172a] tracking-wide">
        {question}
      </div>
      <div className="mt-5 text-4xl sm:text-6xl font-black text-[#2563eb] min-h-16">
        {input || "?"}
      </div>
    </div>
  );
}
