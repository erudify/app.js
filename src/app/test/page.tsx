"use client";

import { useState, useCallback, ChangeEvent, KeyboardEvent } from "react";
import { processPinyinInput } from "@/lib/pinyin";

export default function TestPage() {
  const [value, setValue] = useState("");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const key = e.key;

      // Check if it's a tone number (0-4)
      if (/^[0-4]$/.test(key)) {
        e.preventDefault();
        const input = e.currentTarget;
        const selectionStart = input.selectionStart ?? value.length;

        const { newText, newCursorPos } = processPinyinInput(
          value,
          selectionStart,
          parseInt(key, 10)
        );

        setValue(newText);

        // Set cursor position after React updates the input
        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
      }
    },
    [value]
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white p-8 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-white">
          Test Page
        </h1>

        <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
            Pinyin Input with Tone Marks
          </h2>

          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Type pinyin followed by a tone number (1-4) to add tone marks. Use 0
            to remove the last tone mark.
          </p>

          <div className="mb-6">
            <input
              type="text"
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type pinyin here... (e.g., ni3hao3)"
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 placeholder-zinc-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
            />
          </div>

          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Examples:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">
                  ni3hao3
                </code>{" "}
                → nǐhǎo
              </li>
              <li>
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">
                  xuesheng21
                </code>{" "}
                → xuéshēng
              </li>
              <li>
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">
                  lv4
                </code>{" "}
                → lǜ (v = ü)
              </li>
              <li>
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">
                  nǐhǎo0
                </code>{" "}
                → nǐhao (removes last tone)
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
