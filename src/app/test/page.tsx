"use client";

import { usePinyinInput } from "@/hooks/usePinyinInput";
import type { ExerciseSegment } from "@/lib/domain/exercise";

interface Segment {
  chinese: string;
  pinyin: string;
}

interface SentenceData {
  segments: Segment[];
  english: string;
}

const sampleSentence: SentenceData = {
  segments: [
    { chinese: "我", pinyin: "wǒ" },
    { chinese: "是", pinyin: "shì" },
    { chinese: "学生", pinyin: "xué sheng" },
    { chinese: "。", pinyin: "" },
  ],
  english: "I am a student.",
};

export default function TestPage() {
  const { isComplete, reset } = usePinyinInput({
    segments: sampleSentence.segments.map((s) => ({
      chinese: s.chinese,
      pinyin: s.pinyin,
    })) as ExerciseSegment[],
    onComplete: () => {},
    autoAdvance: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white p-8 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-white">
          Pinyin Input Exercise
        </h1>

        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Type pinyin for each Chinese character. Use tone numbers (1-4)
            to add tone marks.
          </p>

          <div className="mb-8 flex flex-wrap items-start gap-2 text-4xl">
            {sampleSentence.segments.map((segment, idx) => {
              if (segment.pinyin === "") {
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span className="text-zinc-900 dark:text-white">
                      {segment.chinese}
                    </span>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-zinc-900 dark:text-white">
                    {segment.chinese}
                  </span>
                  {isComplete ? (
                    <span className="text-base text-green-600 dark:text-green-400">
                      {segment.pinyin}
                    </span>
                  ) : (
                    <span className="text-base text-zinc-400 dark:text-zinc-600">
                      ___
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {isComplete && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-lg text-green-800 dark:text-green-200">
                {sampleSentence.english}
              </p>
            </div>
          )}

          {isComplete && (
            <button
              onClick={reset}
              className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              Try Again
            </button>
          )}

          <div className="mt-6 space-y-2 border-t border-zinc-200 pt-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Tips:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Type pinyin followed by a tone number (1-4) for tone marks</li>
              <li>
                Example:{" "}
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">
                  wo3
                </code>{" "}
                becomes wǒ
              </li>
              <li>Use 0 to remove the last tone mark</li>
              <li>v = ü (e.g., lv4 → lǜ)</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
