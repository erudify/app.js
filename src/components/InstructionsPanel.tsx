"use client";

export function InstructionsPanel() {
  return (
    <div className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      <p className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
        How to study:
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
        <li>
          Press{" "}
          <kbd className="rounded bg-zinc-200 px-2 py-1 font-mono dark:bg-zinc-700">
            Escape
          </kbd>{" "}
          to see a hint (will affect your review schedule)
        </li>
        <li>Use 0 to remove the last tone mark</li>
        <li>v = ü (e.g., lv4 → lǜ)</li>
      </ul>
    </div>
  );
}
